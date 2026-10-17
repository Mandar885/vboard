import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { COMMUNITY_ROLE_LABEL, type CommunityRole } from "@/lib/rbac"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function SectionCards({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  badge,
  footer,
  hint,
}: {
  label: string
  value: number | string
  badge?: React.ReactNode
  footer?: string
  hint?: string
}) {
  return (
    <div className="bg-card text-card-foreground ring-foreground/10 rounded-lg p-4 ring-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {badge}
      </div>
      <div className="mt-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {footer && (
        <p className="text-muted-foreground mt-1.5 text-xs">{footer}</p>
      )}
      {hint && <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>}
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <Card className={cn(flush && "gap-0 pb-0", className)}>
      {(title || action) && (
        <CardHeader className={cn(flush && "border-b pb-4")}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn(flush && "px-0")}>{children}</CardContent>
    </Card>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {body && (
        <p className="text-muted-foreground max-w-sm text-xs text-balance">
          {body}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function RoleBadge({ role }: { role: CommunityRole | "admin" }) {
  const label = role === "admin" ? "Site admin" : COMMUNITY_ROLE_LABEL[role]
  return (
    <Badge
      variant={role === "lead" || role === "admin" ? "default" : "secondary"}
    >
      {label}
    </Badge>
  )
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  published: "default",
  approved: "default",
  attended: "default",
  active: "default",
  pending: "outline",
  draft: "secondary",
  cancelled: "secondary",
  completed: "secondary",
  no_show: "secondary",
  archived: "secondary",
  rejected: "destructive",
  hidden: "destructive",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  )
}
