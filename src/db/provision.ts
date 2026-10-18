import { config } from "dotenv"
import { Pool } from "pg"
import { pathToFileURL } from "node:url"

type ProvisionOptions = {
  appPassword: string
  superAdminEmails: string[]
}
type RoleState = {
  rolsuper: boolean
  rolbypassrls: boolean
  rolreplication: boolean
  rolcreaterole: boolean
  rolcreatedb: boolean
}
function literal(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

export async function provision(pool: Pool, options: ProvisionOptions) {
  if (!options.appPassword) throw new Error("Application password is required")
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
      let result = await client.query<RoleState>(
        "SELECT rolsuper,rolbypassrls,rolreplication,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=$1",
        [role]
      )
      if (!result.rows.length) {
        await client.query(
          `CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION`
        )
        result = await client.query<RoleState>(
          "SELECT rolsuper,rolbypassrls,rolreplication,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=$1",
          [role]
        )
      }
      const state = result.rows[0]
      if (
        !state ||
        state.rolsuper ||
        state.rolbypassrls ||
        state.rolreplication
      )
        throw new Error(
          `${role} has unsafe role attributes; repair administratively before provisioning`
        )
      const restrictions = [
        state.rolcreaterole ? "NOCREATEROLE" : null,
        state.rolcreatedb ? "NOCREATEDB" : null,
      ].filter(Boolean)
      if (restrictions.length)
        await client.query(`ALTER ROLE ${role} ${restrictions.join(" ")}`)
      const memberships = await client.query<{ parent: string }>(
        "SELECT parent.rolname AS parent FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE child.rolname=$1",
        [role]
      )
      for (const { parent } of memberships.rows)
        await client.query(
          `REVOKE "${parent.replaceAll('"', '""')}" FROM ${role}`
        )
      const verified = await client.query<{ valid: boolean }>(
        `SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolreplication
          AND NOT r.rolcreaterole AND NOT r.rolcreatedb
          AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS valid
        FROM pg_roles r WHERE r.rolname=$1`,
        [role]
      )
      if (!verified.rows[0]?.valid)
        throw new Error(`${role} did not satisfy restricted role requirements`)
    }
    await client.query(
      `ALTER ROLE vboard_app LOGIN PASSWORD ${literal(options.appPassword)}`
    )
    await client.query("ALTER ROLE vboard_auth NOLOGIN PASSWORD NULL")
    await client.query("ALTER ROLE vboard_guard NOLOGIN")
    await client.query("GRANT vboard_guard TO CURRENT_USER WITH INHERIT TRUE")
    await client.query("GRANT vboard_guard TO CURRENT_USER WITH SET TRUE")
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
