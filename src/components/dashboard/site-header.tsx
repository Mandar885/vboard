"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  registrations: "My registrations",
  events: "All events",
  profile: "Profile",
  admin: "Admin",
  communities: "Communities",
  people: "People",
  audit: "Audit log",
  posts: "Posts",
  new: "New post",
  edit: "Edit",
  team: "Team",
  settings: "Settings",
}

export function SiteHeader({ names }: { names: Record<string, string> }) {
  const pathname = usePathname()
  const parts = pathname.split("/").filter(Boolean)
  const crumbs: { href: string; label: string }[] = []
  parts.forEach((part, i) => {
    if (part === "c") return
    const label =
      names[part] ?? LABELS[part] ?? (parts[i - 1] === "posts" ? "Post" : null)
    if (!label) return
    crumbs.push({ href: `/${parts.slice(0, i + 1).join("/")}`, label })
  })

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            {crumbs.map((c, i) => (
              <Fragment key={c.href}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {i === crumbs.length - 1 ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={c.href} />}>
                      {c.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <ThemeToggle variant="dashboard" className="ml-auto shrink-0" />
      </div>
    </header>
  )
}
