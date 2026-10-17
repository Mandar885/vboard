"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({
  variant = "site",
  className,
}: {
  variant?: "site" | "dashboard"
  className?: string
}) {
  const { setTheme } = useTheme()

  function toggle() {
    const dark = document.documentElement.classList.contains("dark")
    setTheme(dark ? "light" : "dark")
  }

  const icons = (
    <>
      <Moon
        aria-hidden
        className={cn("dark:hidden", variant === "site" && "size-3.5")}
      />
      <Sun
        aria-hidden
        className={cn("hidden dark:block", variant === "site" && "size-3.5")}
      />
      <span className="sr-only">
        <span className="dark:hidden">Switch to dark mode</span>
        <span className="hidden dark:inline">Switch to light mode</span>
      </span>
    </>
  )

  if (variant === "dashboard") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={className}
        onClick={toggle}
      >
        {icons}
      </Button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-dim)] transition-colors hover:border-[var(--text)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
        className
      )}
      onClick={toggle}
    >
      {icons}
    </button>
  )
}
