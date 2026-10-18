import { EMPTY_POST, PostForm } from "@/components/dashboard/post-form"
import { requireCommunityAccess } from "@/lib/session"
import { createPostAction } from "@/app/dashboard/c/[slug]/posts/actions"

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const access = await requireCommunityAccess(slug, "post:write")
  return (
    <>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Create a post</h2>
        <p className="text-muted-foreground text-sm">
          Share an announcement or bring people together for an event.
        </p>
      </div>
      <PostForm
        action={createPostAction}
        slug={slug}
        defaults={EMPTY_POST}
        canPublish={access.can("post:publish")}
        mode="create"
      />
    </>
  )
}
