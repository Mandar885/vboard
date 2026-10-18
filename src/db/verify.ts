import { config } from "dotenv"
import { Pool } from "pg"
import { pathToFileURL } from "node:url"
import { verifyPrincipal } from "@/db/pool"

export async function verifyDatabase(app: Pool, auth: Pool) {
  await verifyPrincipal(app, "vboard_app")
  await verifyPrincipal(auth, "vboard_auth")
  const result = await app.query<{ valid: boolean }>(`
    SELECT NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('profile','community','community_member','post','registration','audit_log')
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)) AND
      NOT has_table_privilege(current_user,'public.user','SELECT') AND
      NOT has_table_privilege(current_user,'public.post','DELETE') AND
      NOT has_schema_privilege(current_user,'vboard_private','USAGE') AND
      NOT has_function_privilege(current_user,'vboard_api.post_projection(uuid)','EXECUTE') AS valid`)
  if (!result.rows[0]?.valid)
    throw new Error("Domain security configuration is invalid")
  const authResult = await auth.query<{ valid: boolean }>(
    `SELECT NOT has_table_privilege(current_user,'public.profile','SELECT') AND NOT has_schema_privilege(current_user,'vboard_private','USAGE') AS valid`
  )
  if (!authResult.rows[0]?.valid)
    throw new Error("Auth principal has domain privileges")
}
async function main() {
  config({ path: ".env.local", quiet: true })
  if (!process.env.DATABASE_URL || !process.env.AUTH_DATABASE_URL)
    throw new Error("Runtime database URLs are required")
  const app = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  const auth = new Pool({
    connectionString: process.env.AUTH_DATABASE_URL,
    max: 1,
  })
  try {
    await verifyDatabase(app, auth)
    console.log("Runtime principals, RLS and grant boundaries verified")
  } finally {
    await Promise.all([app.end(), auth.end()])
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Verification failed"
    )
    process.exitCode = 1
  })
