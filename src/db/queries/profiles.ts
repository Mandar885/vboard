import { and, asc, eq, ilike, or, sql } from "drizzle-orm"
import { db } from "@/db"
import { profile, user } from "@/db/schema"

export async function ensureProfile(userId: string) {
  await db.insert(profile).values({ userId }).onConflictDoNothing()
}

export async function getProfile(userId: string) {
  const row = await db.query.profile.findFirst({
    where: eq(profile.userId, userId),
  })
  return row ?? null
}

export async function updateProfile(
  userId: string,
  data: {
    rollNumber: string | null
    department: string | null
    bio: string | null
  }
) {
  await db
    .insert(profile)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: profile.userId,
      set: { ...data, updatedAt: new Date() },
    })
}

export async function getUserByEmail(email: string) {
  const row = await db.query.user.findFirst({
    where: eq(sql`lower(${user.email})`, email.trim().toLowerCase()),
    columns: { id: true, name: true, email: true },
  })
  return row ?? null
}

export async function setAdminDepartment(
  userId: string,
  adminDepartment: string | null
) {
  await db
    .insert(profile)
    .values({ userId, adminDepartment })
    .onConflictDoUpdate({
      target: profile.userId,
      set: { adminDepartment, updatedAt: new Date() },
    })
}

export async function setSiteRole(
  userId: string,
  siteRole: "admin" | "student"
) {
  await db
    .insert(profile)
    .values({ userId, siteRole })
    .onConflictDoUpdate({
      target: profile.userId,
      set: { siteRole, updatedAt: new Date() },
    })
}

export async function listPeople(search: string, limit = 50) {
  const term = search.trim()
  const where = term
    ? or(
        ilike(user.name, `%${term}%`),
        ilike(user.email, `%${term}%`),
        ilike(profile.rollNumber, `%${term}%`)
      )
    : undefined
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      siteRole: profile.siteRole,
      rollNumber: profile.rollNumber,
      department: profile.department,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(where)
    .orderBy(asc(user.name))
    .limit(limit)
}

export async function countUsers() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(user)
  return row?.n ?? 0
}

export async function countAdmins() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profile)
    .where(and(eq(profile.siteRole, "admin")))
  return row?.n ?? 0
}
