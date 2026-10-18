"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  CalendarDays,
  Compass,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { initials } from "@/lib/identity"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/communities", label: "Communities", icon: Users },
] as const

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function Nav({ user }: { user: { name: string } | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="container flex h-16 items-center gap-8">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2"
          aria-label="vboard home"
        >
          <span className="text-xl font-bold tracking-tight">vboard</span>
          <span className="bg-brand size-2 rounded-sm" aria-hidden />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden h-full items-center gap-6 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={cn(
                "hover:text-foreground relative flex h-full items-center text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "text-foreground after:bg-brand after:absolute after:inset-x-0 after:bottom-0 after:h-0.5"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={user ? "/dashboard" : "/login"}
            className={buttonVariants({
              variant: "outline",
              className: "hidden md:inline-flex",
            })}
          >
            {user && (
              <span
                className="bg-muted grid size-5 place-items-center rounded-full text-[10px]"
                aria-hidden
              >
                {initials(user.name)}
              </span>
            )}
            {user ? "Workspace" : "Sign in"}
          </Link>
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu aria-hidden />
              </SheetTrigger>
              <SheetContent className="w-[min(90vw,360px)]! gap-0">
                <SheetHeader className="border-b p-5">
                  <SheetTitle>vboard</SheetTitle>
                  <SheetDescription>
                    Events and communities at VIT.
                  </SheetDescription>
                </SheetHeader>
                <nav aria-label="Mobile navigation" className="grid gap-1 p-3">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={
                        isActive(pathname, href) ? "page" : undefined
                      }
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                        isActive(pathname, href)
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto border-t p-5">
                  {user && (
                    <p className="text-muted-foreground mb-3 truncate text-sm">
                      Signed in as {user.name}
                    </p>
                  )}
                  <Link
                    href={user ? "/dashboard" : "/login"}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ className: "w-full" })}
                  >
                    {user && <LayoutDashboard aria-hidden />}
                    {user ? "Open workspace" : "Sign in with VOSS"}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
