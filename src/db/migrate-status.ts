import { config } from "dotenv"
import { Pool } from "pg"
import { migrationFiles } from "@/db/migration-files"

async function main() {
  config({ path: ".env.local", quiet: true })
  if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is required")
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 1 })
  try {
    const exists = await pool.query(
      "SELECT to_regclass('public._migrations') AS name"
    )
    const rows = exists.rows[0].name
      ? (
          await pool.query<{ filename: string; checksum: string | null }>(
            "SELECT filename,checksum FROM public._migrations"
          )
        ).rows
      : []
    for (const file of await migrationFiles()) {
      const record = rows.find((row) => row.filename === file.filename)
      if (record && record.checksum !== file.checksum)
        throw new Error(`Migration checksum mismatch: ${file.filename}`)
      console.log(`${record ? "applied" : "pending"} ${file.filename}`)
    }
  } finally {
    await pool.end()
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Migration status failed"
  )
  process.exitCode = 1
})
