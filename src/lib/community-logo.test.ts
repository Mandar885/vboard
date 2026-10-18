import { describe, expect, it } from "vitest"
import {
  MAX_COMMUNITY_LOGO_BYTES,
  readCommunityLogo,
} from "@/lib/community-logo"

const png = Buffer.from("89504e470d0a1a0a00000000", "hex")

describe("community logo file boundary", () => {
  it("treats an unselected file field as no upload", async () => {
    expect(await readCommunityLogo(null)).toEqual({ ok: true, data: null })
    expect(await readCommunityLogo(new File([], ""))).toEqual({
      ok: true,
      data: null,
    })
  })

  it.each([
    [png, "image/png", "png"],
    [Buffer.from("ffd8ffe00000", "hex"), "image/jpeg", "jpg"],
    [Buffer.from("RIFF0000WEBP"), "image/webp", "webp"],
  ])(
    "recognizes %s by bytes and declared type",
    async (bytes, type, extension) => {
      const result = await readCommunityLogo(
        new File([bytes], "untrusted-name.svg", { type })
      )
      expect(result).toMatchObject({
        ok: true,
        data: { contentType: type, extension },
      })
    }
  )

  it("rejects disguised HTML and mismatched image signatures", async () => {
    expect(
      (
        await readCommunityLogo(
          new File(["<html>"], "logo.png", { type: "image/png" })
        )
      ).ok
    ).toBe(false)
    expect(
      (
        await readCommunityLogo(
          new File([png], "logo.jpg", { type: "image/jpeg" })
        )
      ).ok
    ).toBe(false)
  })

  it("rejects SVG, strings and named empty files", async () => {
    for (const value of [
      "forged",
      new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
      new File([], "logo.png", { type: "image/png" }),
    ])
      expect((await readCommunityLogo(value)).ok).toBe(false)
  })

  it("accepts 2 MiB and rejects the next byte before reading the file", async () => {
    const bytes = new Uint8Array(MAX_COMMUNITY_LOGO_BYTES)
    bytes.set(png)
    expect(
      (
        await readCommunityLogo(
          new File([bytes], "logo.png", { type: "image/png" })
        )
      ).ok
    ).toBe(true)
    const tooLarge = new File([bytes, "x"], "logo.png", { type: "image/png" })
    tooLarge.arrayBuffer = () => {
      throw new Error("oversized content must not be read")
    }
    expect(await readCommunityLogo(tooLarge)).toEqual({
      ok: false,
      error: "Logo must be 2 MiB or smaller.",
    })
  })
})
