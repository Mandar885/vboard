import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-8" aria-label="Loading page" role="status">
      <span className="sr-only">Loading page…</span>
      <div className="space-y-3">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="bg-card space-y-4 rounded-xl border p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
