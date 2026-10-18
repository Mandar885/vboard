import { z } from "zod"
import { createInsertSchema } from "drizzle-zod"
import { community, communityMember, post, profile } from "@/db/schema"
import { parseCampusDateTime } from "@/lib/format"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))

const campusDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null
    const date = parseCampusDateTime(v)
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time" })
      return z.NEVER
    }
    return date
  })

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true")

export const postFormSchema = createInsertSchema(post)
  .pick({
    title: true,
    body: true,
    visibility: true,
    isPinned: true,
    isEvent: true,
    startsAt: true,
    endsAt: true,
    location: true,
    locationVisibility: true,
    registrationOpensAt: true,
    registrationClosesAt: true,
    capacity: true,
    requiresApproval: true,
  })
  .extend({
    title: z.string().trim().min(3, "Title is too short").max(140),
    body: z.string().trim().min(1, "Write something").max(10000),
    visibility: z.enum(["public", "vit_only"]),
    isPinned: checkbox,
    isEvent: checkbox,
    startsAt: campusDate,
    endsAt: campusDate,
    location: optionalText(200),
    locationVisibility: z.enum(["public", "after_approval"]),
    registrationOpensAt: campusDate,
    registrationClosesAt: campusDate,
    capacity: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null
        const n = Number(v)
        if (!Number.isInteger(n) || n < 1 || n > 100000) {
          ctx.addIssue({
            code: "custom",
            message: "Capacity must be a whole number",
          })
          return z.NEVER
        }
        return n
      }),
    requiresApproval: checkbox,
    intent: z.enum(["draft", "publish", "save"]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.isEvent) return
    if (!v.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Events need a start time",
      })
    if (!v.endsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Events need an end time",
      })
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be after the start",
      })
    if (
      v.registrationOpensAt &&
      v.registrationClosesAt &&
      v.registrationClosesAt <= v.registrationOpensAt
    )
      ctx.addIssue({
        code: "custom",
        path: ["registrationClosesAt"],
        message: "Registration must close after it opens",
      })
  })
  .transform((v) => ({
    title: v.title,
    body: v.body,
    visibility: v.visibility,
    isPinned: v.isPinned,
    isEvent: v.isEvent,
    startsAt: v.isEvent ? v.startsAt : null,
    endsAt: v.isEvent ? v.endsAt : null,
    location: v.isEvent ? v.location : null,
    locationVisibility: v.isEvent ? v.locationVisibility : null,
    registrationOpensAt: v.isEvent ? v.registrationOpensAt : null,
    registrationClosesAt: v.isEvent ? v.registrationClosesAt : null,
    capacity: v.isEvent ? v.capacity : null,
    requiresApproval: v.isEvent ? v.requiresApproval : false,
    intent: v.intent,
  }))

export const communityFormSchema = createInsertSchema(community)
  .pick({ name: true, description: true, logoUrl: true })
  .extend({
    name: z.string().trim().min(2, "Name is too short").max(80),
    description: z.string().trim().max(600),
    logoUrl: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.url("Logo must be a URL").nullable()),
  })
  .strict()

export const newCommunitySchema = createInsertSchema(community)
  .pick({ name: true, slug: true, description: true })
  .extend({
    name: z.string().trim().min(2, "Name is too short").max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers and hyphens"
      )
      .max(60),
    description: z.string().trim().max(600),
    leadEmail: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v.toLowerCase()))
      .pipe(z.email("Enter a valid email").nullable()),
  })
  .strict()

export const memberFormSchema = createInsertSchema(communityMember)
  .pick({ role: true })
  .extend({
    email: z
      .email("Enter a valid email")
      .transform((v) => v.trim().toLowerCase()),
    role: createInsertSchema(communityMember).shape.role.unwrap(),
  })
  .strict()

export const profileFormSchema = createInsertSchema(profile)
  .pick({ rollNumber: true, department: true, bio: true })
  .extend({
    rollNumber: optionalText(30),
    department: optionalText(60),
    bio: optionalText(400),
  })
  .strict()

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again"
}
