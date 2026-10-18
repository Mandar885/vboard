import { Table } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export function RecordTable({
  className,
  ...props
}: React.ComponentProps<typeof Table>) {
  return (
    <Table
      className={cn(
        "[&_td[data-label]]:before:text-muted-foreground block md:table [&_a]:break-words [&_tbody]:grid md:[&_tbody]:table-row-group [&_td]:block [&_td]:min-w-0 [&_td]:p-0 [&_td]:text-left [&_td]:whitespace-normal md:[&_td]:table-cell md:[&_td]:px-4 md:[&_td]:py-3 [&_td:empty]:hidden md:[&_td:empty]:table-cell [&_td>div]:max-w-full [&_td>div]:break-words [&_td[data-label]]:flex [&_td[data-label]]:flex-wrap [&_td[data-label]]:items-center [&_td[data-label]]:gap-x-3 [&_td[data-label]]:gap-y-1 [&_td[data-label]]:before:text-xs [&_td[data-label]]:before:content-[attr(data-label)] md:[&_td[data-label]]:table-cell md:[&_td[data-label]]:before:content-none [&_th]:px-4 [&_thead]:sr-only md:[&_thead]:not-sr-only md:[&_thead]:table-header-group [&_tr]:grid [&_tr]:min-w-0 [&_tr]:gap-2 [&_tr]:p-4 md:[&_tr]:table-row md:[&_tr]:p-0",
        className
      )}
      {...props}
    />
  )
}
