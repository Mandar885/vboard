import { config } from "dotenv"
import { Pool } from "pg"
import { pathToFileURL } from "node:url"

type ProvisionOptions = {
  appPassword: string
  authPassword: string
  superAdminEmails: string[]
}
function literal(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

export async function provision(pool: Pool, options: ProvisionOptions) {
  if (!options.appPassword || !options.authPassword)
    throw new Error("Application and auth passwords are required")
  const emails = [
    ...new Set(
      options.superAdminEmails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
  if (emails.some((email) => !/^[^\s@]+@vit\.edu\.in$/.test(email)))
    throw new Error("Superadmin allowlist requires VIT email addresses")
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('vboard:provision',0))"
    )
    for (const role of ["vboard_app", "vboard_auth", "vboard_guard"]) {
      const result = await client.query(
        "SELECT 1 FROM pg_roles WHERE rolname=$1",
        [role]
      )
      if (!result.rows.length)
        await client.query(
          `CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION`
        )
      await client.query(
        `ALTER ROLE ${role} NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION`
      )
      const memberships = await client.query<{ parent: string }>(
        "SELECT parent.rolname AS parent FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE child.rolname=$1",
        [role]
      )
      for (const { parent } of memberships.rows)
        await client.query(
          `REVOKE "${parent.replaceAll('"', '""')}" FROM ${role}`
        )
    }
    await client.query(
      `ALTER ROLE vboard_app LOGIN PASSWORD ${literal(options.appPassword)}`
    )
    await client.query(
      `ALTER ROLE vboard_auth LOGIN PASSWORD ${literal(options.authPassword)}`
    )
    await client.query("ALTER ROLE vboard_guard NOLOGIN")
    await client.query("CREATE SCHEMA IF NOT EXISTS vboard_private")
    await client.query(
      "REVOKE ALL ON SCHEMA vboard_private FROM PUBLIC,vboard_app,vboard_auth"
    )
    await client.query(
      "CREATE TABLE IF NOT EXISTS vboard_private.super_admin_email(email text PRIMARY KEY CHECK (email=lower(email)))"
    )
    await client.query("DELETE FROM vboard_private.super_admin_email")
    await client.query(
      "INSERT INTO vboard_private.super_admin_email(email) SELECT unnest($1::text[])",
      [emails]
    )
    await client.query(
      "REVOKE ALL ON vboard_private.super_admin_email FROM PUBLIC,vboard_app,vboard_auth"
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
async function main() {
  config({ path: ".env.local", quiet: true })
  if (!process.env.DIRECT_URL)
    throw new Error("DIRECT_URL is required for provisioning")
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 1 })
  try {
    await provision(pool, {
      appPassword: process.env.VBOARD_APP_PASSWORD ?? "",
      authPassword: process.env.VBOARD_AUTH_PASSWORD ?? "",
      superAdminEmails: (process.env.SUPER_ADMIN_EMAILS ?? "").split(","),
    })
    console.log("Restricted roles and Superadmin allowlist provisioned")
  } finally {
    await pool.end()
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error(
      "Provisioning failed; inspect credentials and administrative privileges"
    )
    process.exitCode = 1
  })
