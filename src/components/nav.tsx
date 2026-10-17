"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { initials } from "@/lib/identity"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "Discover" },
  { href: "/calendar", label: "Calendar" },
  { href: "/communities", label: "Communities" },
] as const

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Nav({ user }: { user: { name: string } | null }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        "border-b border-[var(--border)]",
        scrolled ? "bg-[var(--bg)]" : "bg-transparent"
      )}
    >
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-end gap-1.5"
            aria-label="vboard home"
          >
            <span
              className="text-[1.25rem] leading-none font-extrabold tracking-[-0.045em]"
              style={{ color: "var(--text)" }}
            >
              vboard
            </span>
            <span
              className="mb-[3px] block size-2.5"
              style={{ background: "var(--brand-pure)" }}
              aria-hidden
            />
          </Link>

          <div className="flex items-center gap-3 md:gap-7">
            <ul className="hidden items-center gap-7 md:flex">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-active={isActive(pathname, link.href) || undefined}
                    className="relative inline-block py-1.5 font-mono text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors hover:text-[var(--text)] data-[active=true]:text-[var(--brand)] data-[active=true]:after:absolute data-[active=true]:after:right-0 data-[active=true]:after:bottom-0 data-[active=true]:after:left-0 data-[active=true]:after:h-[2px] data-[active=true]:after:bg-[var(--brand)]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li
                aria-hidden
                className="mx-1 h-4 w-px"
                style={{ background: "var(--border)" }}
              />
              {user ? (
                <li>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2.5 rounded-[var(--radius-sm)] py-1 pr-3 pl-1 font-mono text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors"
                    style={{ background: "var(--text)", color: "var(--bg)" }}
                  >
                    <span
                      className="grid size-6 place-items-center rounded-[var(--radius-sm)] text-[0.65rem]"
                      style={{ background: "var(--brand-pure)", color: "#fff" }}
                      aria-hidden
                    >
                      {initials(user.name)}
                    </span>
                    Dashboard
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      href="/login"
                      className="font-mono text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors hover:text-[var(--brand)]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[0.78rem] font-medium tracking-[0.06em] uppercase transition-colors"
                      style={{ background: "var(--text)", color: "var(--bg)" }}
                    >
                      Join <span aria-hidden>→</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
            <ThemeToggle />
            <Link
              href={user ? "/dashboard" : "/login"}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 font-mono text-[0.78rem] font-medium tracking-[0.06em] uppercase md:hidden"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              {user ? "Dashboard" : "Join"}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
