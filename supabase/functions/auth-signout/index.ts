import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { REFRESH_COOKIE, clearCookie } from '../_shared/cookie.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  // x-access-token is the user's JWT sent from memory — used to revoke all sessions server-side
  const accessToken = req.headers.get('x-access-token')

  if (accessToken) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    // Best-effort — revoke all tokens for this user globally
    await supabase.auth.admin.signOut(accessToken).catch(() => {})
  }

  const headers = new Headers({ 'Content-Type': 'application/json' })
  headers.append('Set-Cookie', clearCookie(REFRESH_COOKIE))

  return new Response(JSON.stringify({ success: true }), { headers })
})
