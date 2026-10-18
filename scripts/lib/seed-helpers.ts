import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type { SeedDatabase } from "./seed-db"
import { user } from "@/db/schema"
import type { RegistrationStatus } from "@/lib/registration"

const FIRST = [
  "Aditi",
  "Arjun",
  "Diya",
  "Ishaan",
  "Kavya",
  "Mihir",
  "Nikita",
  "Omkar",
  "Pooja",
  "Rahul",
  "Sanya",
  "Tanmay",
  "Vedika",
  "Yash",
  "Zoya",
  "Aniket",
  "Bhavna",
  "Chirag",
  "Esha",
  "Gaurav",
]
const LAST = [
  "Patil",
  "Sharma",
  "Kulkarni",
  "Deshmukh",
  "Rao",
  "Gupta",
  "Joshi",
  "Naik",
]
export const DEPARTMENTS = ["CMPN", "INFT", "EXTC", "BIOMED"]

export function studentIdentity(i: number) {
  const first = FIRST[i % FIRST.length]
  const last = LAST[(i * 7) % LAST.length]
  return {
    name: `${first} ${last}`,
    email: `${first}.${last}${i}@vit.edu.in`.toLowerCase(),
  }
}

export async function upsertUser(
  db: SeedDatabase,
  name: string,
  email: string
) {
  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  })
  if (existing) return existing.id
  const id = randomUUID()
  const now = new Date()
  await db.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export function registrationStatus(
  post: { status: string; requiresApproval: boolean; endsAt?: Date },
  i: number,
  now: Date
): RegistrationStatus {
  if (post.status === "cancelled") return "cancelled"
  if (post.endsAt && post.endsAt < now) {
    if (i % 20 === 19) return "cancelled"
    return i % 7 === 6 ? "no_show" : "attended"
  }
  if (post.requiresApproval) {
    if (i % 9 === 8) return "rejected"
    return i % 3 === 0 ? "approved" : "pending"
  }
  return i % 15 === 14 ? "cancelled" : "approved"
}
