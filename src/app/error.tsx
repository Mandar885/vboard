"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container flex min-h-[65dvh] flex-col items-center justify-center gap-4 py-10">
      <div className="w-full max-w-lg">
        <EmptyState
          title="We couldn't load this page"
          body="Try loading it again. You can also return to Discover and continue browsing."
          icon={<AlertCircle />}
          action={
            <>
              <Button onClick={reset}>Try again</Button>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Back to discover
              </Link>
            </>
          }
        />
      </div>
      {error.digest && (
        <p className="text-muted-foreground text-xs">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  )
}
