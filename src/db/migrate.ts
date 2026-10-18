import { config } from "dotenv"
import { Pool } from "pg"
import { pathToFileURL } from "node:url"
import { migrationFiles } from "@/db/migration-files"

export async function migrate(pool: Pool) {
  const client = await pool.connect()
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtextextended('vboard:migrations',0))"
    )
    await client.query(
      "CREATE TABLE IF NOT EXISTS public._migrations (id serial PRIMARY KEY,filename text NOT NULL UNIQUE,checksum text,applied_at timestamptz NOT NULL DEFAULT now())"
    )
    await client.query(
      "ALTER TABLE public._migrations ADD COLUMN IF NOT EXISTS checksum text"
    )
    const { rows } = await client.query<{
      filename: string
      checksum: string | null
    }>("SELECT filename,checksum FROM public._migrations")
    const files = await migrationFiles()
    for (const applied of rows) {
      const file = files.find((file) => file.filename === applied.filename)
      if (!file || !applied.checksum || applied.checksum !== file.checksum)
        throw new Error(`Migration history mismatch: ${applied.filename}`)
    }
    for (const file of files) {
      if (rows.some((row) => row.filename === file.filename)) continue
      await client.query("BEGIN")
      try {
        await client.query(file.content)
        await client.query(
          "INSERT INTO public._migrations(filename,checksum) VALUES($1,$2)",
          [file.filename, file.checksum]
        )
        await client.query("COMMIT")
        console.log(`Applied ${file.filename}`)
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      }
    }
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtextextended('vboard:migrations',0))"
    )
    client.release()
  }
}

async function main() {
  config({ path: ".env.local", quiet: true })
  if (process.argv.includes("--baseline"))
    throw new Error("Baselining without executing migrations is not supported")
  const connectionString = process.env.DIRECT_URL
  if (!connectionString)
    throw new Error("DIRECT_URL is required for migrations")
  const pool = new Pool({ connectionString, max: 1 })
  try {
    await migrate(pool)
  } finally {
    await pool.end()
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Migration failed")
    process.exitCode = 1
  })
