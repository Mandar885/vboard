import { ActionForm } from "@/components/action-form"
import { FormFooter, Panel } from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { requireCommunityAccess } from "@/lib/session"
import { updateCommunityAction } from "@/app/dashboard/c/[slug]/settings/actions"

export default async function CommunitySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { community } = await requireCommunityAccess(slug, "community:update")

  return (
    <Panel
      title="Community details"
      description="Your public identity. Changes appear on the community page and its posts."
      className="max-w-3xl"
    >
      <ActionForm
        key={[community.name, community.description, community.logoUrl].join(
          "|"
        )}
        action={updateCommunityAction}
      >
        <input type="hidden" name="slug" value={slug} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              defaultValue={community.name}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">About</FieldLabel>
            <Textarea
              id="description"
              name="description"
              defaultValue={community.description}
              maxLength={600}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="logoUrl">Logo URL</FieldLabel>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={community.logoUrl ?? ""}
              placeholder="https://"
            />
            <FieldDescription>
              Use a publicly accessible image URL.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Input
              className="font-mono text-xs"
              id="address"
              value={`/communities/${community.slug}`}
              readOnly
            />
          </Field>
          <FormFooter description="Your community address stays the same.">
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </FormFooter>
        </FieldGroup>
      </ActionForm>
    </Panel>
  )
}
