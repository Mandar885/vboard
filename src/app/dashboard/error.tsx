"use client"

import Link from "next/link"
import { EmptyState } from "@/components/dashboard/ui"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      title="This workspace page could not load"
      body="Try loading it again, or return to your overview."
      action={
        <>
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to overview
          </Link>
        </>
      }
    />
  )
}
