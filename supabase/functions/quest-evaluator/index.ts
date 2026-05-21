import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

/**
 * Returns the number of consecutive days ending on (and including) today
 * that a given profile has a 'present' or 'late' attendance record.
 */
function calcStreak(dates: string[], todayStr: string): number {
  const set = new Set(dates)
  let streak = 0
  const cursor = new Date(todayStr + 'T00:00:00Z')
  while (true) {
    const d = cursor.toISOString().split('T')[0]
    if (!set.has(d)) break
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // ── 1. Load all active streak quests ──────────────────────────────────────
  const { data: quests, error: questsErr } = await supabase
    .from('quests')
    .select('id, required_count')
    .eq('is_active', true)
    .eq('quest_type', 'streak')

  if (questsErr) return json({ error: questsErr.message }, 500)
  if (!quests || quests.length === 0) return json({ updated: 0 })

  // ── 2. Load all active internal profiles ──────────────────────────────────
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_active', true)
    .not('role', 'in', '("client_owner","client_member")')

  if (profilesErr) return json({ error: profilesErr.message }, 500)
  if (!profiles || profiles.length === 0) return json({ updated: 0 })

  // ── 3. Load last 60 days of attendance (all internal employees at once) ───
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 60)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: records, error: recordsErr } = await supabase
    .from('attendance')
    .select('profile_id, date, status')
    .in('status', ['present', 'late'])
    .gte('date', sinceStr)

  if (recordsErr) return json({ error: recordsErr.message }, 500)

  // Group attendance dates by profile
  const attendanceByProfile = new Map<string, string[]>()
  for (const r of records ?? []) {
    const list = attendanceByProfile.get(r.profile_id) ?? []
    list.push(r.date)
    attendanceByProfile.set(r.profile_id, list)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // ── 4. Upsert quest_progress for each profile × streak quest ──────────────
  const upserts: Array<{
    profile_id: string
    quest_id: string
    progress: number
    completed_at: string | null
  }> = []

  for (const profile of profiles) {
    const dates = attendanceByProfile.get(profile.id) ?? []
    const streak = calcStreak(dates, todayStr)

    for (const quest of quests) {
      const isComplete = streak >= quest.required_count
      upserts.push({
        profile_id: profile.id,
        quest_id: quest.id,
        progress: Math.min(streak, quest.required_count),
        completed_at: isComplete ? new Date().toISOString() : null,
      })
    }
  }

  const { error: upsertErr } = await supabase
    .from('quest_progress')
    .upsert(upserts, { onConflict: 'profile_id,quest_id' })

  if (upsertErr) return json({ error: upsertErr.message }, 500)

  // ── 5. Award XP for newly-completed quests ─────────────────────────────────
  // Load all quests again to get xp_reward
  const { data: questDetails } = await supabase
    .from('quests')
    .select('id, xp_reward, required_count')
    .eq('is_active', true)
    .eq('quest_type', 'streak')

  const questMap = new Map((questDetails ?? []).map((q: { id: string; xp_reward: number; required_count: number }) => [q.id, q]))

  const xpInserts: Array<{ profile_id: string; amount: number; source: string; description: string }> = []

  for (const u of upserts) {
    const quest = questMap.get(u.quest_id)
    if (!quest || !u.completed_at) continue
    if (u.progress < quest.required_count) continue

    // Only award if not previously awarded — check existing completed records
    // We'll rely on the upsert above; if completed_at was already set this is a no-op
    xpInserts.push({
      profile_id: u.profile_id,
      amount: quest.xp_reward,
      source: 'quest',
      description: `Streak quest completed (${quest.required_count}-day streak)`,
    })
  }

  if (xpInserts.length > 0) {
    // Load existing completed quests to avoid re-awarding
    const profileIds = [...new Set(xpInserts.map((x) => x.profile_id))]
    const questIds   = [...new Set(upserts.filter((u) => u.completed_at).map((u) => u.quest_id))]

    const { data: alreadyDone } = await supabase
      .from('quest_progress')
      .select('profile_id, quest_id, completed_at')
      .in('profile_id', profileIds)
      .in('quest_id', questIds)
      .not('completed_at', 'is', null)

    const doneKeys = new Set((alreadyDone ?? []).map((r: { profile_id: string; quest_id: string }) => `${r.profile_id}:${r.quest_id}`))

    const newCompletions = upserts.filter(
      (u) => u.completed_at && !doneKeys.has(`${u.profile_id}:${u.quest_id}`),
    )

    if (newCompletions.length > 0) {
      const xpToInsert = newCompletions.map((u) => {
        const quest = questMap.get(u.quest_id)
        return {
          profile_id: u.profile_id,
          amount: quest?.xp_reward ?? 0,
          source: 'quest',
          description: `Streak quest completed (${quest?.required_count ?? 0}-day streak)`,
        }
      })
      await supabase.from('xp_transactions').insert(xpToInsert)
    }
  }

  return json({ updated: upserts.length, profiles: profiles.length, quests: quests.length })
})
