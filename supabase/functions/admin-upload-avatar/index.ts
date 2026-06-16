import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_AVATAR_BYTES = 10 * 1024 * 1024
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Invalid form data' }, 400)
  }

  const profileId = String(form.get('profile_id') ?? '')
  const avatar = form.get('avatar')
  if (!profileId) return json({ error: 'profile_id is required' }, 400)
  if (!(avatar instanceof File)) return json({ error: 'avatar image is required' }, 400)
  if (!avatar.type.startsWith('image/')) return json({ error: 'Please choose an image file' }, 400)
  if (avatar.size > MAX_AVATAR_BYTES) return json({ error: 'Image must be under 10 MB' }, 400)

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
  if (authError || !caller) return json({ error: 'Unauthorized' }, 401)

  const { data: me } = await service.from('profiles').select('role').eq('id', caller.id).maybeSingle()
  if (!me || !['super_admin', 'admin'].includes(me.role)) {
    return json({ error: 'You do not have permission to update avatars' }, 403)
  }

  const { data: target } = await service.from('profiles').select('role').eq('id', profileId).maybeSingle()
  if (!target) return json({ error: 'profile_not_found' }, 404)
  if (me.role === 'admin' && target.role === 'super_admin') return json({ error: 'forbidden_target' }, 403)

  const ext = avatar.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${profileId}/avatar-${Date.now()}.${ext}`
  const { error: uploadError } = await service.storage
    .from('avatars')
    .upload(path, avatar, { upsert: true, cacheControl: '3600', contentType: avatar.type })
  if (uploadError) return json({ error: uploadError.message }, 400)

  const { data } = service.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = data.publicUrl

  const { error: updateError } = await service.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profileId)
  if (updateError) return json({ error: updateError.message }, 500)

  return json({ ok: true, avatar_url: avatarUrl }, 200)
})
