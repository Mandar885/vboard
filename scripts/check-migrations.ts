import { config } from "dotenv"
import { pathToFileURL } from "node:url"
import { Pool } from "pg"
import { migrationFiles } from "@/db/migration-files"

export async function checkMigrations(pool: Pool) {
  const files = await migrationFiles()
  const { rows } = await pool.query<{
    filename: string
    checksum: string | null
  }>("SELECT filename,checksum FROM public._migrations ORDER BY filename")
  const mismatches: string[] = []
  for (const file of files) {
    const applied = rows.find((row) => row.filename === file.filename)
    if (!applied) mismatches.push(`not applied: ${file.filename}`)
    else if (applied.checksum !== file.checksum)
      mismatches.push(`checksum mismatch: ${file.filename}`)
  }
  for (const applied of rows) {
    if (!files.some((file) => file.filename === applied.filename))
      mismatches.push(`applied but not in the repo: ${applied.filename}`)
  }
  if (mismatches.length) throw new Error(mismatches.join("\n"))
  return files.length
}

async function main() {
  config({ path: ".env.local", quiet: true })
  if (!process.env.DIRECT_URL) throw new Error("DIRECT_URL is required")
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 1 })
  try {
    const count = await checkMigrations(pool)
    console.log(
      `${count} migration(s) applied, checksums and ledger match the repo`
    )
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Migration check failed"
    )
    process.exitCode = 1
  })
