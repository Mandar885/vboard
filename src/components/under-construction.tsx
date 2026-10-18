import Link from "next/link"
import { Wrench } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"

type Props = {
  title?: string
  description?: string
  upcoming?: string[]
  phase?: string
}

export function UnderConstruction({
  title = "Under development",
  description,
  upcoming,
  phase,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {phase && <Badge variant="outline">{phase}</Badge>}
        </div>
        {description && (
          <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {upcoming && upcoming.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Planned next</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
              {upcoming.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to discover
        </Link>
      </CardContent>
    </Card>
  )
}

export function DevelopmentNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed">
      <Wrench
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
        aria-hidden
      />
      <div>{children}</div>
    </div>
  )
}
