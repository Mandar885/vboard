import { config } from "dotenv"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { requireLocalDatabase } from "@/db/driver"
import * as schema from "@/db/schema"

config({ path: ".env.local" })
const url = process.env.DIRECT_URL
if (!url) throw new Error("DIRECT_URL is required for local fixture loading")
requireLocalDatabase(url)
export const seedPool = new Pool({ connectionString: url, max: 1 })
export const seedDb = drizzle(seedPool, { schema })
export type SeedDatabase = Pick<typeof seedDb, "query" | "insert">
