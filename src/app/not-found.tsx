import Link from "next/link"
import { Compass } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { buttonVariants } from "@/components/ui/button-variants"

export default function NotFound() {
  return (
    <div className="container flex min-h-[65dvh] items-center justify-center py-10">
      <div className="w-full max-w-lg">
        <EmptyState
          title="This page isn't available"
          body="The link may have changed, or this page is no longer available. Find current events and communities on Discover."
          icon={<Compass />}
          action={
            <Link href="/" className={buttonVariants()}>
              Back to discover
            </Link>
          }
        />
      </div>
    </div>
  )
}
