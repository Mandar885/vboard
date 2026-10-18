import { Pool } from "pg"

export function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")
  return new Pool({
    connectionString,
    max: 5,
    allowExitOnIdle: true,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  })
}

export async function verifyPrincipal(pool: Pool) {
  const {
    rows: [role],
  } = await pool.query<{ valid: boolean }>(
    `
    SELECT current_user = $1 AND NOT r.rolsuper AND NOT r.rolbypassrls
      AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication
      AND NOT EXISTS (SELECT 1 FROM pg_roles other WHERE other.rolname <> current_user
        AND pg_has_role(current_user, other.oid, 'MEMBER'))
      AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = r.oid AND c.relnamespace = 'public'::regnamespace)
      AND NOT has_schema_privilege(current_user, 'public', 'CREATE') AS valid
    FROM pg_roles r WHERE r.rolname = current_user`,
    ["vboard_app"]
  )
  if (!role?.valid)
    throw new Error("Database principal must be the restricted vboard_app role")
}
