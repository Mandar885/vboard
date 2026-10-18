"use client"

import { useFormStatus } from "react-dom"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ButtonVariants } from "@/components/ui/button-variants"

export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  name,
  value,
  className,
  disabled,
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  name?: string
  value?: string
  className?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      name={name}
      value={value}
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending && (
        <Loader2Icon data-icon="inline-start" className="animate-spin" />
      )}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
