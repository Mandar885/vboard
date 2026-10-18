import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { authDb } from "@/db/auth-db"
import { authOptions } from "@/lib/auth-config"

const options = authOptions()
export const auth = betterAuth({
  ...options,
  database: drizzleAdapter(authDb, { provider: "pg" }),
  plugins: [...options.plugins, nextCookies()],
})

export { verifyAuthDatabase } from "@/db/auth-db"
