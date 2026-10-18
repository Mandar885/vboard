import { z } from "zod"

export const MAX_COMMUNITY_LOGO_BYTES = 2 * 1024 * 1024

const contentTypes = ["image/png", "image/jpeg", "image/webp"] as const
type ContentType = (typeof contentTypes)[number]

export type CommunityLogoUpload = {
  body: Uint8Array
  contentType: ContentType
  extension: "png" | "jpg" | "webp"
}

const fileSchema = z
  .instanceof(File, { error: "Choose an image file." })
  .refine((file) => file.size > 0, "Choose a nonempty image.")
  .refine(
    (file) => file.size <= MAX_COMMUNITY_LOGO_BYTES,
    "Logo must be 2 MiB or smaller."
  )
  .refine(
    (file) => contentTypes.includes(file.type as ContentType),
    "Use a PNG, JPEG or WebP image."
  )

function imageType(bytes: Uint8Array): ContentType | null {
  const signature = Buffer.from(bytes)
  if (signature.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    return "image/png"
  if (signature.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")))
    return "image/jpeg"
  if (
    signature.length >= 12 &&
    signature.toString("ascii", 0, 4) === "RIFF" &&
    signature.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp"
  return null
}

export async function readCommunityLogo(value: FormDataEntryValue | null) {
  if (value === null || (value instanceof File && !value.name && !value.size))
    return { ok: true as const, data: null }
  const parsed = fileSchema.safeParse(value)
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0].message }
  const body = new Uint8Array(await parsed.data.arrayBuffer())
  const contentType = imageType(body)
  if (!contentType || contentType !== parsed.data.type)
    return {
      ok: false as const,
      error: "The image contents do not match its type.",
    }
  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : "webp"
  return {
    ok: true as const,
    data: { body, contentType, extension } satisfies CommunityLogoUpload,
  }
}

export function isStoredCommunityLogo(value: string | null) {
  return value?.startsWith("neon://") ?? false
}
