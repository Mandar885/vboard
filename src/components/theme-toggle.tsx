"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle({
  variant = "site",
  className,
}: {
  variant?: "site" | "dashboard"
  className?: string
}) {
  const { setTheme } = useTheme()
  return (
    <Button
      type="button"
      variant="ghost"
      size={variant === "dashboard" ? "icon-sm" : "icon"}
      className={className}
      onClick={() =>
        setTheme(
          document.documentElement.classList.contains("dark") ? "light" : "dark"
        )
      }
    >
      <Moon className="dark:hidden" aria-hidden />
      <Sun className="hidden dark:block" aria-hidden />
      <span className="sr-only">
        <span className="dark:hidden">Switch to dark mode</span>
        <span className="hidden dark:inline">Switch to light mode</span>
      </span>
    </Button>
  )
}
