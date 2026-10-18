import { Client } from "pg"

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])
const LOCAL_QUERY_OPTIONS = new Set([
  "application_name",
  "connect_timeout",
  "ssl",
  "sslmode",
  "sslnegotiation",
  "uselibpqcompat",
])

function localTarget(url: string): { target: URL; database: string } {
  const target = new URL(url)
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !LOOPBACK_HOSTS.has(target.hostname) ||
    !target.pathname.slice(1) ||
    [...target.searchParams.keys()].some((key) => !LOCAL_QUERY_OPTIONS.has(key))
  ) {
    throw new Error(
      "A loopback PostgreSQL target without routing overrides is required"
    )
  }
  const client = new Client({ connectionString: url })
  const database = decodeURI(target.pathname.slice(1))
  if (
    !LOOPBACK_HOSTS.has(client.host) ||
    client.database !== database ||
    !Number.isInteger(client.port) ||
    client.port < 1 ||
    client.port > 65535
  ) {
    throw new Error("The effective PostgreSQL target must be loopback")
  }
  return { target, database }
}

export function isLocalPostgres(url: string): boolean {
  try {
    localTarget(url)
    return true
  } catch {
    return false
  }
}

export function requireLocalDatabase(url: string, disposable = false): URL {
  let parsed: ReturnType<typeof localTarget>
  try {
    parsed = localTarget(url)
  } catch {
    throw new Error(
      "A loopback PostgreSQL target without routing overrides is required"
    )
  }
  if (disposable && !/^vboard_test_[a-z0-9_]+$/.test(parsed.database)) {
    throw new Error("Disposable databases must use the vboard_test_ prefix")
  }
  return parsed.target
}
