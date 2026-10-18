"use client"

import { useActionState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { ActionResult } from "@/lib/action-result"

type Action = (
  prev: ActionResult | null,
  formData: FormData
) => Promise<ActionResult>

export function ActionForm({
  action,
  children,
  className,
  onDone,
}: {
  action: Action
  children: React.ReactNode
  className?: string
  onDone?: () => void
}) {
  const form = useRef<HTMLFormElement>(null)
  const allowReset = useRef(false)
  const [state, formAction] = useActionState(action, null)
  const onDoneRef = useRef(onDone)
  const attachForm = useCallback((element: HTMLFormElement | null) => {
    form.current = element
    if (!element) return
    const preserveValues = (event: Event) => {
      if (!allowReset.current) event.preventDefault()
    }
    element.addEventListener("reset", preserveValues)
    return () => element.removeEventListener("reset", preserveValues)
  }, [])

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      allowReset.current = true
      form.current?.reset()
      allowReset.current = false
      if (state.message) toast.success(state.message)
      onDoneRef.current?.()
    } else {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={attachForm} action={formAction} className={className}>
      {children}
      {state && !state.ok && (
        <p
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed"
        >
          {state.error}
        </p>
      )}
    </form>
  )
}
