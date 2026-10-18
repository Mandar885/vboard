type SessionApi = {
  getSession: (input: {
    headers: Headers
    query: { disableCookieCache: true; disableRefresh: true }
  }) => Promise<{ session: { token: string } } | null>
  revokeSession: (input: {
    headers: Headers
    body: { token: string }
  }) => Promise<{ status: boolean }>
  signOut: (input: { headers: Headers }) => Promise<{ success: boolean }>
}

export async function revokeProductSession(api: SessionApi, headers: Headers) {
  const lookup = {
    headers,
    query: { disableCookieCache: true, disableRefresh: true } as const,
  }
  const trusted = await api.getSession(lookup)
  if (trusted) {
    const revoked = await api.revokeSession({
      headers,
      body: { token: trusted.session.token },
    })
    if (!revoked.status || (await api.getSession(lookup))) {
      throw new Error("Product session revocation did not complete")
    }
  }
  const result = await api.signOut({ headers })
  if (!result.success) throw new Error("Product session cookie clearing failed")
}
