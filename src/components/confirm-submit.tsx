"use client"

import { useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ButtonVariants } from "@/components/ui/button-variants"

export function ConfirmSubmit({
  label,
  title,
  description,
  confirmLabel,
  variant = "destructive",
  size = "sm",
}: {
  label: string
  title: string
  description?: string
  confirmLabel: string
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
}) {
  const [open, setOpen] = useState(false)
  const { pending } = useFormStatus()
  const anchor = useRef<HTMLSpanElement>(null)

  return (
    <span ref={anchor}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant={variant}
              size={size}
              disabled={pending}
              aria-busy={pending}
            />
          }
        >
          {pending ? "Please wait…" : label}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={variant === "destructive" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => {
                setOpen(false)
                anchor.current?.closest("form")?.requestSubmit()
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  )
}
