import { auth, verifyAuthDatabase } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { VOSS_UNAVAILABLE, vossProvider } from "@/lib/auth-config"
export const dynamic = "force-dynamic"
const handlers = toNextJsHandler(auth)
function unavailableProvider(request: Request) {
  const path = new URL(request.url).pathname
  if (
    !vossProvider() &&
    ["/sign-in/oauth2", "/oauth2/callback/voss", "/oauth2/link"].some(
      (endpoint) => path === `/api/auth${endpoint}`
    )
  ) {
    return Response.json(
      { code: "VOSS_UNAVAILABLE", message: VOSS_UNAVAILABLE },
      { status: 503 }
    )
  }
}
export async function GET(request: Request) {
  const unavailable = unavailableProvider(request)
  if (unavailable) return unavailable
  await verifyAuthDatabase()
  return handlers.GET(request)
}
export async function POST(request: Request) {
  const unavailable = unavailableProvider(request)
  if (unavailable) return unavailable
  await verifyAuthDatabase()
  return handlers.POST(request)
}
