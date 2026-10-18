import "server-only"
import { randomUUID } from "node:crypto"
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { z } from "zod"
import type { CommunityLogoUpload } from "@/lib/community-logo"
import { isStoredCommunityLogo } from "@/lib/community-logo"

const storageSchema = z.object({
  endpoint: z.url().refine((value) => {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
  }),
  region: z.string().min(1),
  bucket: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
})

function storageConfig() {
  return storageSchema.parse({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    bucket: process.env.NEON_STORAGE_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
}

function storageClient(config: ReturnType<typeof storageConfig>) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  })
}

export function communityLogoUrl(reference: string | null) {
  if (!reference || !isStoredCommunityLogo(reference)) return reference
  const endpoint = process.env.AWS_ENDPOINT_URL_S3
  const bucket = process.env.NEON_STORAGE_BUCKET
  if (!endpoint || !bucket) return null
  try {
    const stored = new URL(reference)
    const origin = new URL(endpoint)
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      stored.hostname !== bucket ||
      stored.search ||
      stored.hash ||
      !/^\/community-logos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(
        stored.pathname
      )
    )
      return null
    return new URL(
      `${bucket}${stored.pathname}`,
      `${origin.href.replace(/\/$/, "")}/`
    ).href
  } catch {
    return null
  }
}

export async function uploadCommunityLogo(
  communityId: string,
  image: CommunityLogoUpload
) {
  const config = storageConfig()
  const client = storageClient(config)
  const key = `community-logos/${communityId}/${randomUUID()}.${image.extension}`
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: image.body,
        ContentType: image.contentType,
        ContentLength: image.body.byteLength,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { abortSignal: AbortSignal.timeout(15_000) }
    )
  } finally {
    client.destroy()
  }
  return { key, reference: `neon://${config.bucket}/${key}` }
}

export async function discardCommunityLogo(key: string) {
  const config = storageConfig()
  const client = storageClient(config)
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      {
        abortSignal: AbortSignal.timeout(15_000),
      }
    )
  } finally {
    client.destroy()
  }
}
