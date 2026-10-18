"use client"

import { createContext, useContext, useEffect, useState } from "react"

type RouteName = { id: string; title: string } | null
const RouteContext = createContext<{
  route: RouteName
  setRoute: (route: RouteName) => void
}>({ route: null, setRoute: () => {} })

export function WorkspaceRouteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [route, setRoute] = useState<RouteName>(null)
  return <RouteContext value={{ route, setRoute }}>{children}</RouteContext>
}

export function WorkspaceRouteTitle({
  id,
  title,
}: {
  id: string
  title: string
}) {
  const { setRoute } = useContext(RouteContext)
  useEffect(() => {
    setRoute({ id, title })
    return () => setRoute(null)
  }, [id, title, setRoute])
  return null
}

export function useWorkspaceRoute() {
  return useContext(RouteContext).route
}
