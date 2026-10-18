import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export async function migrationFiles() {
  const directory = join(dirname(fileURLToPath(import.meta.url)), "migrations")
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()
  return Promise.all(
    names.map(async (filename) => {
      const content = await readFile(join(directory, filename), "utf8")
      return {
        filename,
        content,
        checksum: createHash("sha256").update(content).digest("hex"),
      }
    })
  )
}
