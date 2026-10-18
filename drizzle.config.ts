import { config } from "dotenv"
config({ path: ".env.local" })

import { defineConfig } from "drizzle-kit"

const directUrl = process.env.DIRECT_URL
if (!directUrl) throw new Error("DIRECT_URL is required for schema tooling")

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: directUrl,
  },
})
