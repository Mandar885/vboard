import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-card mt-auto border-t">
      <div className="container flex flex-col gap-5 py-7 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex min-h-8 items-center gap-2 text-base font-semibold tracking-tight"
          >
            vboard
            <span className="bg-brand size-1.5 rounded-sm" aria-hidden />
          </Link>
          <p className="text-muted-foreground text-xs">
            Events and community for VIT. Built by voss-labs.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
        >
          <Link
            href="/"
            className="hover:text-foreground flex min-h-11 items-center"
          >
            Discover
          </Link>
          <Link
            href="/calendar"
            className="hover:text-foreground flex min-h-11 items-center"
          >
            Calendar
          </Link>
          <Link
            href="/communities"
            className="hover:text-foreground flex min-h-11 items-center"
          >
            Communities
          </Link>
          <a
            href="https://github.com/voss-labs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground flex min-h-11 items-center gap-1"
          >
            GitHub
            <ArrowUpRight className="size-3.5" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </footer>
  )
}
