import { execSync, spawnSync } from "node:child_process"
import { copyFileSync, existsSync, readFileSync } from "node:fs"
import { isLocalPostgres } from "@/db/driver"

const step = (n: number, msg: string) => console.log(`\n[${n}/5] ${msg}`)

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function compose(): string[] {
  for (const candidate of [["docker", "compose"], ["docker-compose"]]) {
    try {
      execSync(`${candidate.join(" ")} version`, { stdio: "ignore" })
      return candidate
    } catch {}
  }
  console.error(
    "\nNo Docker engine is available.\n" +
      "Start OrbStack (or Docker Desktop) and re-run.\n"
  )
  process.exit(1)
}

function readEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(".env.local")) return out
  for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
  return out
}

function assertLocal() {
  const file = readEnvLocal()
  const checks: [string, string, string][] = []
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (file[name]) checks.push([name, file[name], ".env.local"])
    if (process.env[name]) checks.push([name, process.env[name]!, "the shell"])
  }

  const remote = checks.filter(([, url]) => !isLocalPostgres(url))
  if (remote.length === 0) return

  console.error("\n  Refusing to continue.\n")
  for (const [name, url, source] of remote) {
    let host = "invalid URL"
    try {
      host = new URL(url).hostname
    } catch {}
    console.error(`    ${name} points at ${host}  (from ${source})`)
  }
  console.error(`
  This command provisions roles, applies migrations and loads local fixtures, and only ever runs against
  the local container.
`)
  if (remote.some(([, , source]) => source === "the shell")) {
    console.error(`  That value is exported in your shell, which beats .env.local. Unset it:

    unset DATABASE_URL DIRECT_URL
    npm run dev:setup
`)
  } else {
    console.error(`  Your .env.local points somewhere else, most likely a real environment.
  Move it aside:

    mv .env.local .env.local.remote
    npm run dev:setup
`)
  }
  process.exit(1)
}

async function waitForPostgres(bin: string, sub: string[]) {
  process.stdout.write("  waiting for postgres")
  const deadline = Date.now() + 60_000
  for (;;) {
    const r = spawnSync(
      bin,
      [
        ...sub,
        "exec",
        "-T",
        "postgres",
        "pg_isready",
        "-U",
        "vboard",
        "-d",
        "vboard",
      ],
      { stdio: "ignore" }
    )
    if (r.status === 0) break
    if (Date.now() > deadline) {
      console.error("\n  postgres did not become ready within 60s.")
      console.error(`  check: ${bin} ${sub.join(" ")} logs postgres`)
      process.exit(1)
    }
    process.stdout.write(".")
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  console.log(" ready")
}

async function main() {
  step(1, "environment")
  if (!existsSync(".env.local")) {
    copyFileSync(".env.development.example", ".env.local")
    console.log("  created .env.local from .env.development.example")
  } else {
    console.log("  .env.local already exists, leaving it alone")
  }

  step(2, "checking the target is local")
  assertLocal()
  console.log("  local database, safe to proceed")

  step(3, "database container")
  const [bin, ...sub] = compose()
  run(bin, [...sub, "up", "-d"])
  await waitForPostgres(bin, sub)

  step(4, "schema")
  run("node", ["--import", "tsx", "src/db/provision.ts"])
  run("node", ["--import", "tsx", "src/db/migrate.ts"])
  run("node", ["--import", "tsx", "src/db/verify.ts"])

  step(5, "mock data")
  run("node", ["--import", "tsx", "scripts/seed-dev.ts"])

  console.log(`
Ready. Start the app:

  npm run dev

Then open http://localhost:3000/login and pick a persona: Super admin,
Lead, Organizer or Student. No VOSS
credentials needed; roles still resolve from the database.

  npm run dev:seed    rewrite the mock data
  npm run dev:down    stop the container (data is kept)
  npm run dev:reset   destroy the container and its data, then start over
`)
}

main()
