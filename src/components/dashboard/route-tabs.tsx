"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function RouteTabs({
  items,
}: {
  items: { href: string; label: string; match?: string[] }[]
}) {
  const pathname = usePathname()
  const active =
    items.find(
      (i) => pathname === i.href || i.match?.some((m) => pathname.startsWith(m))
    )?.href ?? items[0]?.href

  return (
    <Tabs value={active}>
      <TabsList
        variant="line"
        className="h-auto min-h-11 flex-wrap justify-start"
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.href}
            value={item.href}
            className="min-h-11"
            nativeButton={false}
            render={<Link href={item.href} />}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
