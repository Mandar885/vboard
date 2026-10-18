import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  communityLogoUrl,
  discardCommunityLogo,
  uploadCommunityLogo,
} from "@/lib/object-storage"

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  send: vi.fn(),
  destroy: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    constructor(config: unknown) {
      mocks.client(config)
    }
    send = mocks.send
    destroy = mocks.destroy
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
}))

const communityId = "c7c1339b-cf14-471a-96e8-82d8f93901df"
const key = `community-logos/${communityId}/08116243-476f-425b-b551-c590281474ab.png`
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("AWS_ENDPOINT_URL_S3", "https://preview.storage.example.neon.tech")
  vi.stubEnv("AWS_REGION", "us-east-2")
  vi.stubEnv("AWS_ACCESS_KEY_ID", "test-storage-key")
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test-storage-secret")
  vi.stubEnv("NEON_STORAGE_BUCKET", "vboard-assets")
  mocks.send.mockResolvedValue({})
})
afterEach(() => vi.unstubAllEnvs())

describe("branch scoped object storage", () => {
  it("resolves inherited object keys through the current branch endpoint", () => {
    expect(communityLogoUrl(`neon://vboard-assets/${key}`)).toBe(
      `https://preview.storage.example.neon.tech/vboard-assets/${key}`
    )
    vi.stubEnv(
      "AWS_ENDPOINT_URL_S3",
      "https://production.storage.example.neon.tech"
    )
    expect(communityLogoUrl(`neon://vboard-assets/${key}`)).toBe(
      `https://production.storage.example.neon.tech/vboard-assets/${key}`
    )
    expect(communityLogoUrl("https://example.org/logo.png")).toBe(
      "https://example.org/logo.png"
    )
  })

  it("fails closed for missing config, malformed paths and a different bucket", () => {
    for (const value of [
      `neon://private/${key}`,
      "neon://vboard-assets/../private/file",
      `neon://vboard-assets/${key}?token=unexpected`,
    ])
      expect(communityLogoUrl(value)).toBeNull()
    vi.stubEnv("AWS_ENDPOINT_URL_S3", "")
    expect(communityLogoUrl(`neon://vboard-assets/${key}`)).toBeNull()
  })

  it("uploads with a fresh immutable key, correct content headers and path style", async () => {
    const result = await uploadCommunityLogo(communityId, {
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
      extension: "png",
    })
    expect(result.key).toMatch(
      new RegExp(`^community-logos/${communityId}/[a-f0-9-]{36}\\.png$`)
    )
    expect(result.reference).toBe(`neon://vboard-assets/${result.key}`)
    expect(mocks.client).toHaveBeenCalledWith(
      expect.objectContaining({
        forcePathStyle: true,
        endpoint: "https://preview.storage.example.neon.tech",
        credentials: {
          accessKeyId: "test-storage-key",
          secretAccessKey: "test-storage-secret",
        },
      })
    )
    expect(mocks.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "vboard-assets",
      Key: result.key,
      ContentType: "image/png",
      ContentLength: 3,
      CacheControl: "public, max-age=31536000, immutable",
    })
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })

  it("fails before constructing a client with missing credentials", async () => {
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "")
    await expect(
      uploadCommunityLogo(communityId, {
        body: new Uint8Array(),
        contentType: "image/png",
        extension: "png",
      })
    ).rejects.toThrow()
    expect(mocks.client).not.toHaveBeenCalled()
  })

  it.each(["not a url", "http://", "http://storage.example.org"])(
    "returns a schema error for invalid storage endpoint %s",
    async (endpoint) => {
      vi.stubEnv("AWS_ENDPOINT_URL_S3", endpoint)
      await expect(
        uploadCommunityLogo(communityId, {
          body: new Uint8Array(),
          contentType: "image/png",
          extension: "png",
        })
      ).rejects.toMatchObject({ name: "ZodError" })
      expect(mocks.client).not.toHaveBeenCalled()
    }
  )

  it("deletes only the supplied newly created key", async () => {
    await discardCommunityLogo(key)
    expect(mocks.send.mock.calls[0][0].input).toEqual({
      Bucket: "vboard-assets",
      Key: key,
    })
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })
})
