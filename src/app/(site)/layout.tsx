import { Footer } from "@/components/footer"
import { Nav } from "@/components/nav"
import { getSessionUser } from "@/lib/session"

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav user={user ? { name: user.name } : null} />
      <main id="main-content" className="container flex-1 py-8 md:py-10">
        {children}
      </main>
      <Footer />
    </div>
  )
}
