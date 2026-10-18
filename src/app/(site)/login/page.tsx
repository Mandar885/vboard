import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ArrowRight, CalendarDays, CheckCircle2, Users } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { VossSignIn } from "@/components/voss-sign-in"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { devAuthProps } from "@/lib/dev-auth"
import { signInAsPersona } from "@/lib/dev-auth-actions"
import { getSessionUser } from "@/lib/session"

export const metadata: Metadata = { title: "Sign in · vboard" }
export const dynamic = "force-dynamic"

const ERRORS: Record<string, string> = {
  account_not_linked:
    "This email already has a vboard account that could not be linked. Contact the vboard team.",
  unable_to_create_user:
    "vboard is for VIT accounts. Sign in with your @vit.edu.in VOSS account.",
}

function safeNext(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard"
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const next = safeNext(params.next)
  if (await getSessionUser()) redirect(next)
  const devAuth = await devAuthProps()
  const error = params.error
    ? (ERRORS[params.error] ?? "Sign-in did not complete. Try again.")
    : null

  return (
    <div className="mx-auto grid max-w-4xl items-start gap-8 py-3 md:grid-cols-[1fr_380px] md:gap-12 md:py-8">
      <div className="space-y-7">
        <PageHeader
          title="Be part of what's next"
          description="Sign in to join campus events and keep your registrations in one place."
          className="[&_h1]:text-3xl md:[&_h1]:text-4xl"
        />
        <ul className="grid gap-5 text-sm">
          <li className="flex items-start gap-3">
            <CalendarDays
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-medium">Find your next event</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                See what&apos;s happening across VIT communities.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-medium">Register once, stay organized</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Register for events and track approval requests in your
                workspace.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Users
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-medium">One VOSS account</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Use the same verified VIT account across VOSS apps.
              </p>
            </div>
          </li>
        </ul>
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to vboard</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Continue with your @vit.edu.in VOSS account.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <p
                role="alert"
                className="text-destructive border-destructive/25 bg-destructive/5 rounded-lg border p-3 text-sm leading-relaxed"
              >
                {error}
              </p>
            )}
            <VossSignIn next={next} />
            <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
              New to VOSS? Your account is created the first time you sign in.
              Your VIT email is verified at accounts.vosslabs.org.
            </p>
          </CardContent>
        </Card>
        {devAuth && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Local development</CardTitle>
                <Badge variant="outline">Dev only</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Use a seeded persona. Permissions still come from the database.
              </p>
            </CardHeader>
            <CardContent>
              <form action={signInAsPersona} className="grid gap-2">
                <input type="hidden" name="next" value={next} />
                {devAuth.personas.map((persona) => (
                  <SubmitButton
                    key={persona.key}
                    name="persona"
                    value={persona.key}
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-between gap-3 py-3 text-left whitespace-normal"
                  >
                    <span className="grid min-w-0 gap-1">
                      <span className="text-sm font-medium">
                        {persona.label}
                        <span className="text-muted-foreground block text-xs font-normal">
                          {persona.name}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs leading-relaxed font-normal">
                        {persona.description}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5" aria-hidden />
                  </SubmitButton>
                ))}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
