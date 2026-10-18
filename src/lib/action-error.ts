import { fail, type ActionResult } from "@/lib/action-result"
export async function attemptAction(
  work: () => Promise<ActionResult>
): Promise<ActionResult> {
  try {
    return await work()
  } catch {
    return fail(
      "This change could not be saved. Check your access and the current record, then try again."
    )
  }
}
