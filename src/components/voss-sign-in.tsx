"use client"

import { useState } from "react"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { safeReturnPath } from "@/lib/auth-redirect"

export function VossSignIn({
  next,
  available,
}: {
  next: string
  available: boolean
}) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function signIn() {
    if (!available) return
    setError("")
    setLoading(true)
    try {
      const { error } = await authClient.signIn.oauth2({
        providerId: "voss",
        callbackURL: safeReturnPath(next),
        errorCallbackURL: "/login",
      })
      if (error) {
        setLoading(false)
        setError(
          error.message ?? "Could not reach VOSS. Try again in a moment."
        )
      }
    } catch {
      setLoading(false)
      setError("Could not reach VOSS. Check your connection and try again.")
    }
  }

  return (
    <div className="space-y-3">
      {!available && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          VOSS sign-in is currently unavailable.
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm leading-relaxed">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="lg"
        onClick={signIn}
        disabled={loading || !available}
        aria-busy={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {loading ? "Redirecting to VOSS…" : "Continue with VOSS"}
        {!loading && <ArrowUpRight data-icon="inline-end" aria-hidden />}
      </Button>
    </div>
  )
}
