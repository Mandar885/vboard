"use client"

import { useState } from "react"
import { ActionForm } from "@/components/action-form"
import { FormFooter } from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  currentYear,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  parseRollNumber,
} from "@/lib/roll-number"
import { updateProfileAction } from "@/app/dashboard/profile/actions"

export function ProfileForm({
  initialRollNumber,
  initialBio,
  academicDate,
}: {
  initialRollNumber: string | null
  initialBio: string | null
  academicDate: string
}) {
  const [rollNumber, setRollNumber] = useState(initialRollNumber ?? "")
  const [touched, setTouched] = useState(Boolean(initialRollNumber))
  let parsed: ReturnType<typeof parseRollNumber> | null = null
  let error: string | null = null
  if (rollNumber.trim()) {
    try {
      parsed = parseRollNumber(rollNumber)
      if (!parsed)
        throw new Error(
          "Enter a valid VIT roll number, for example 23108A0054."
        )
      if (!parsed.department) {
        error = "Use a roll number for Bio-med, EXCS, EXTC, CMPN or IT."
        parsed = null
      }
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : "Enter a valid roll number."
    }
  }
  const year = parsed
    ? currentYear(rollNumber, new Date(`${academicDate}T12:00:00`))
    : null
  const showError = Boolean(
    error && (touched || rollNumber.trim().length >= 10)
  )

  return (
    <ActionForm action={updateProfileAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="rollNumber">Roll number</FieldLabel>
          <Input
            id="rollNumber"
            name="rollNumber"
            value={rollNumber}
            onChange={(event) =>
              setRollNumber(event.target.value.toUpperCase())
            }
            onBlur={() => setTouched(true)}
            placeholder="23108A0054"
            maxLength={30}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={showError}
            aria-describedby={showError ? "roll-help roll-error" : "roll-help"}
          />
          <FieldDescription id="roll-help">
            Enter your 10-character VIT roll number to fill your department,
            division and year. Departments:{" "}
            {DEPARTMENTS.map(
              (department) => DEPARTMENT_LABELS[department]
            ).join(", ")}
            .
          </FieldDescription>
          {showError && (
            <p
              id="roll-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {error}
            </p>
          )}
        </Field>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="department">Department</FieldLabel>
            <Input
              id="department"
              value={
                parsed?.department ? DEPARTMENT_LABELS[parsed.department] : ""
              }
              placeholder="From roll number"
              readOnly
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="division">Division</FieldLabel>
            <Input
              id="division"
              value={parsed?.division ?? ""}
              placeholder="From roll number"
              readOnly
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="year">Academic year</FieldLabel>
            <Input
              id="year"
              value={parsed ? (year ?? "Not available") : ""}
              placeholder="From roll number"
              readOnly
            />
          </Field>
        </div>
        {parsed && (
          <FieldDescription>
            {parsed.isDSY && "Direct second-year admission. "}
            {year
              ? "Academic year updates each June."
              : "This admission cohort is outside the current FE–BE years."}
          </FieldDescription>
        )}
        <Field>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={initialBio ?? ""}
            placeholder="A line about you"
            maxLength={400}
          />
          <FieldDescription>
            Shown to organisers alongside your registration.
          </FieldDescription>
        </Field>
        <FormFooter description="Shared with event organizers when you register.">
          <SubmitButton pendingLabel="Saving…" disabled={Boolean(error)}>
            Save profile
          </SubmitButton>
        </FormFooter>
      </FieldGroup>
    </ActionForm>
  )
}
