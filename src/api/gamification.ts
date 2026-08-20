import { supabase } from '../lib/supabase'
import type { Database, Tables, TablesInsert, TablesUpdate } from '../types/database'

export type XpTransactionRow    = Tables<'xp_transactions'>
export type RewardRow           = Tables<'rewards'>
export type RewardRedemptionRow = Tables<'reward_redemptions'>
export type QuestTaskRow        = Tables<'quest_tasks'>
export type QuestTaskClaimRow   = Tables<'quest_task_claims'>
// Identity-only claim view (no proof) visible to all internal staff.
export type QuestClaimant       = Database['public']['Functions']['get_quest_claimants']['Returns'][number]
export type ShoutoutRow         = Tables<'shoutouts'>
export type BadgeRow            = Tables<'badges'>
export type BadgeAwardRow       = Tables<'badge_awards'>
export type MonthlyLpHistoryRow = Tables<'monthly_lp_history'>

export interface LeaderboardEntry {
  profile_id: string
  name: string
  avatar_url: string | null
  role: string
  lp_balance: number
  reputation_total: number
  level: number
  is_restricted: boolean
}

export type ProfileDirectory = Record<string, { name: string; avatar_url: string | null }>

// ── Leaderboard & directory ──────────────────────────────────────────────────────

// Ranked by current-month LP (drives cash-reward eligibility). Reputation shown alongside.
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role, lp_balance, reputation_total, level, is_restricted')
    .eq('is_active', true)
    // Employees excluded from gamification participation are hidden from the board entirely.
    .eq('is_restricted', false)
    .not('role', 'in', '("client_owner","client_member")')
    .order('lp_balance', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []).map((p) => ({
    profile_id: p.id,
    name: p.name,
    avatar_url: p.avatar_url,
    role: p.role,
    lp_balance: p.lp_balance,
    reputation_total: p.reputation_total,
    level: p.level,
    is_restricted: p.is_restricted,
  }))
}

// id → { name, avatar } map for resolving names on claims/shoutouts/redemptions without ambiguous joins.
export async function fetchProfileDirectory(): Promise<ProfileDirectory> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('is_active', true)
  if (error) throw error
  const dir: ProfileDirectory = {}
  for (const p of data ?? []) dir[p.id] = { name: p.name, avatar_url: p.avatar_url }
  return dir
}

// All internal participants incl. restricted + the caller — drives the governor
// Participation panel (the public leaderboard hides restricted, so it can't be used here).
export interface GamificationParticipant {
  profile_id: string
  name: string
  avatar_url: string | null
  is_restricted: boolean
}

export async function fetchGamificationParticipants(): Promise<GamificationParticipant[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, is_restricted')
    .eq('is_active', true)
    .not('role', 'in', '("client_owner","client_member")')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map((p) => ({
    profile_id: p.id, name: p.name, avatar_url: p.avatar_url, is_restricted: p.is_restricted,
  }))
}

// ── Quest Board ────────────────────────────────────────────────────────────────

export async function fetchOpenQuestTasks(): Promise<QuestTaskRow[]> {
  const { data, error } = await supabase
    .from('quest_tasks')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Number of quests the caller can actually claim right now (open, not past
// deadline, slots remaining) — for the sidebar badge. quest_tasks.status is
// never auto-closed, so counting status='open' would include expired/full ones.
export async function fetchClaimableQuestCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_open_claimable_quests')
  if (error) throw error
  return data ?? 0
}

/**
 * How many gamification items are waiting on the caller, scoped server-side to
 * the capabilities they hold. One round-trip, because the sidebar that shows it
 * is mounted on every screen.
 */
export async function fetchGamificationPendingCount(): Promise<number> {
  const { data, error } = await supabase.rpc('gamification_pending_count')
  if (error) throw error
  return data ?? 0
}

export async function fetchAllQuestTasks(): Promise<QuestTaskRow[]> {
  const { data, error } = await supabase
    .from('quest_tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchMyClaims(profileId: string): Promise<QuestTaskClaimRow[]> {
  const { data, error } = await supabase
    .from('quest_task_claims')
    .select('*')
    .eq('profile_id', profileId)
    .order('claimed_at', { ascending: false })
  if (error) throw error
  return data
}

// Submitted claims awaiting review (reviewers see all via RLS).
export async function fetchClaimsToReview(): Promise<QuestTaskClaimRow[]> {
  const { data, error } = await supabase
    .from('quest_task_claims')
    .select('*')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })
  if (error) throw error
  return data
}

// Active claimants (claimed/submitted/approved) across all tasks — identity only,
// visible to every internal staff member via the get_quest_claimants RPC.
export async function fetchQuestClaimants(): Promise<QuestClaimant[]> {
  const { data, error } = await supabase.rpc('get_quest_claimants')
  if (error) throw error
  return data ?? []
}

// Recognizers remove an employee's (non-approved) claim — e.g. a wrong-quest mistake.
export async function releaseQuestClaim(claimId: string): Promise<void> {
  const { error } = await supabase.rpc('release_quest_claim', { p_claim_id: claimId })
  if (error) throw error
}

export async function createQuestTask(
  task: Pick<QuestTaskRow, 'title' | 'description' | 'difficulty' | 'lp_value' | 'max_claims' | 'requires_proof' | 'deadline'>,
  createdBy: string,
): Promise<QuestTaskRow> {
  const payload: TablesInsert<'quest_tasks'> = { ...task, created_by: createdBy }
  const { data, error } = await supabase.from('quest_tasks').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateQuestTask(
  id: string,
  updates: TablesUpdate<'quest_tasks'>,
): Promise<QuestTaskRow> {
  const { data, error } = await supabase.from('quest_tasks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteQuestTask(id: string): Promise<void> {
  const { error } = await supabase.from('quest_tasks').delete().eq('id', id)
  if (error) throw error
}

export async function claimQuestTask(taskId: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_quest_task', { p_task_id: taskId })
  if (error) throw error
  return data
}

export async function submitQuestTask(
  claimId: string,
  proofUrl: string | null,
  proofNote: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('submit_quest_task', {
    p_claim_id: claimId,
    p_proof_url: proofUrl ?? undefined,
    p_proof_note: proofNote ?? undefined,
  })
  if (error) throw error
}

export async function reviewQuestTask(
  claimId: string,
  approve: boolean,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('review_quest_task', {
    p_claim_id: claimId,
    p_approve: approve,
    p_note: note ?? undefined,
  })
  if (error) throw error
}

// ── Shoutouts ────────────────────────────────────────────────────────────────

// The feed backs the month + recipient filters, which scope client-side — so the
// window has to be wide enough that "All months" for one person shows their real
// history rather than whatever fell inside the newest N rows overall.
export async function fetchApprovedShoutouts(): Promise<ShoutoutRow[]> {
  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data
}

export async function fetchPendingShoutouts(): Promise<ShoutoutRow[]> {
  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function giveShoutout(
  toProfileId: string,
  category: string,
  message: string,
  impact: 'standard' | 'high',
  lpValue?: number | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('give_shoutout', {
    p_to_profile_id: toProfileId,
    p_category: category,
    p_message: message,
    p_impact: impact,
    p_lp_value: lpValue ?? undefined,
  })
  if (error) throw error
  return data
}

export async function reviewShoutout(
  id: string,
  approve: boolean,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('review_shoutout', {
    p_id: id,
    p_approve: approve,
    p_note: note ?? undefined,
  })
  if (error) throw error
}

// ── Rewards & redemptions ──────────────────────────────────────────────────────

export async function fetchRewards(): Promise<RewardRow[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('is_active', true)
    .order('xp_cost', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchAllRewards(): Promise<RewardRow[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('xp_cost', { ascending: true })
  if (error) throw error
  return data
}

/** Public bucket holding reward artwork — writes are governor-only via RLS. */
const REWARD_IMAGE_BUCKET = 'reward-images'

export const MAX_REWARD_IMAGE_MB = 5

/**
 * Upload reward artwork and return its public URL. The path is a flat uuid
 * because a brand-new reward has no id yet while the create modal uploads.
 */
export async function uploadRewardImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(REWARD_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(REWARD_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Storage path behind a public reward-image URL, or null when the URL points
 * somewhere else (an externally hosted image we must not try to delete).
 */
function rewardImagePath(publicUrl: string): string | null {
  const marker = `/${REWARD_IMAGE_BUCKET}/`
  const at = publicUrl.indexOf(marker)
  if (at === -1) return null
  const path = publicUrl.slice(at + marker.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

/**
 * Remove reward artwork from storage. Best-effort: a reward row must never be
 * left unsaved because its old file could not be deleted, so callers ignore the
 * outcome and a failed delete only leaves an orphaned object behind.
 */
export async function deleteRewardImage(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return
  const path = rewardImagePath(publicUrl)
  if (!path) return
  await supabase.storage.from(REWARD_IMAGE_BUCKET).remove([path])
}

export async function createReward(
  reward: Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity' | 'tier' | 'is_cash' | 'group_size' | 'image_url'>,
  createdBy: string,
): Promise<RewardRow> {
  const payload: TablesInsert<'rewards'> = { ...reward, created_by: createdBy, is_active: true }
  const { data, error } = await supabase.from('rewards').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateReward(
  id: string,
  updates: TablesUpdate<'rewards'>,
): Promise<RewardRow> {
  const { data, error } = await supabase.from('rewards').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteReward(id: string, imageUrl?: string | null): Promise<void> {
  const { error } = await supabase.from('rewards').delete().eq('id', id)
  if (error) throw error
  // Only after the row is gone — a failed delete would otherwise strand the row
  // pointing at an image that no longer exists.
  await deleteRewardImage(imageUrl ?? null)
}

export async function redeemReward(profileId: string, rewardId: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_profile_id: profileId,
    p_reward_id: rewardId,
  })
  if (error) throw error
  return data
}

export async function fetchMyRedemptions(profileId: string): Promise<RewardRedemptionRow[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Full queue for governors/finance (RLS-gated). Names resolved via the profile directory.
export async function fetchRedemptionQueue(): Promise<RewardRedemptionRow[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function reviewRedemption(
  id: string,
  action: 'approve' | 'reject' | 'fulfill',
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('review_redemption', {
    p_id: id,
    p_action: action,
    p_note: note ?? undefined,
  })
  if (error) throw error
}

// ── Group reward pools ────────────────────────────────────────────────────────
// A group reward (rewards.group_size >= 2) can't be redeemed alone: N employees
// pool equal per-person shares. Points reserve on join and refund on cancel/expire.

export type RewardPoolRow       = Tables<'reward_pools'>
export type RewardPoolMemberRow = Tables<'reward_pool_members'>

export interface RewardPoolWithMembers extends RewardPoolRow {
  members: RewardPoolMemberRow[]
}

// Pools with their members, newest first. Optionally filtered by status
// (e.g. ['open'] for the shop, ['pending','approved'] for the HR queue).
export async function fetchRewardPools(statuses?: string[]): Promise<RewardPoolWithMembers[]> {
  let q = supabase
    .from('reward_pools')
    .select('*, members:reward_pool_members(*)')
    .order('created_at', { ascending: false })
  if (statuses && statuses.length) q = q.in('status', statuses)
  const { data, error } = await q
  if (error) throw error
  // as unknown: the nested-select shape isn't inferred into RewardPoolWithMembers.
  return (data ?? []) as unknown as RewardPoolWithMembers[]
}

// Start a pool for a group reward — reserves the initiator's share. Returns pool id.
export async function openRewardPool(rewardId: string): Promise<string> {
  const { data, error } = await supabase.rpc('open_reward_pool', { p_reward_id: rewardId })
  if (error) throw error
  return data
}

export async function joinRewardPool(poolId: string): Promise<void> {
  const { error } = await supabase.rpc('join_reward_pool', { p_pool_id: poolId })
  if (error) throw error
}

export async function leaveRewardPool(poolId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_reward_pool', { p_pool_id: poolId })
  if (error) throw error
}

// Initiator (or governor) cancels an open pool — refunds every member.
export async function cancelRewardPool(poolId: string, note?: string | null): Promise<void> {
  const { error } = await supabase.rpc('cancel_reward_pool', { p_pool_id: poolId, p_note: note ?? undefined })
  if (error) throw error
}

// Governor/finance review of a filled pool. Reject refunds all members.
export async function reviewRewardPool(
  poolId: string,
  action: 'approve' | 'reject' | 'fulfill',
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('review_reward_pool', {
    p_pool_id: poolId,
    p_action: action,
    p_note: note ?? undefined,
  })
  if (error) throw error
}

// ── Badges ──────────────────────────────────────────────────────────────────────

export async function fetchBadges(): Promise<BadgeRow[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('is_active', true)
    .order('criteria_value', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchMyBadgeAwards(profileId: string): Promise<BadgeAwardRow[]> {
  const { data, error } = await supabase
    .from('badge_awards')
    .select('*')
    .eq('profile_id', profileId)
  if (error) throw error
  return data
}

export async function awardBadge(badgeId: string, profileId: string): Promise<void> {
  const { error } = await supabase.rpc('award_badge', { p_badge_id: badgeId, p_profile_id: profileId })
  if (error) throw error
}

// ── Employee of the Month ────────────────────────────────────────────────────────

export type EmployeeOfMonthRow = Tables<'employee_of_the_month'>

/** Winner for a specific month (1-indexed), or null if none set yet. */
export async function fetchEmployeeOfMonth(
  year: number,
  month: number,
): Promise<EmployeeOfMonthRow | null> {
  const { data, error } = await supabase
    .from('employee_of_the_month')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Governors only (RLS-enforced): set or replace the winner for a month. */
export async function setEmployeeOfMonth(
  year: number,
  month: number,
  profileId: string,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_employee_of_the_month', {
    p_year: year,
    p_month: month,
    p_profile_id: profileId,
    p_note: note ?? undefined,
  })
  if (error) throw error
}

/** Governors only (RLS-enforced): remove a month's winner (chosen by mistake). */
export async function deleteEmployeeOfMonth(year: number, month: number): Promise<void> {
  const { error } = await supabase.rpc('delete_employee_of_the_month', {
    p_year: year,
    p_month: month,
  })
  if (error) throw error
}

// ── LP ledger, grants, restriction, monthly history ─────────────────────────────

export async function fetchXpTransactions(profileId: string): Promise<XpTransactionRow[]> {
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

// Full points ledger for one person (drives the Points History view). The `reason`
// column is self-describing ("Task approved: …", "On-time check-in: …", "Shoutout: …",
// "Redemption: …", or a governor's grant note), so no joins are needed. Admin/HR can
// read any person's ledger via the can_govern_gamification() RLS policy.
export async function fetchPointsLedger(profileId: string): Promise<XpTransactionRow[]> {
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return data
}

// Direct positive LP grant by a governor (HR/Admin). Mirrors into reputation via DB trigger.
export async function grantLp(
  profileId: string,
  amount: number,
  reason: string,
  grantedBy: string,
): Promise<void> {
  const { error } = await supabase.from('xp_transactions').insert({
    profile_id: profileId,
    amount,
    reason,
    granted_by: grantedBy,
  })
  if (error) throw error
}

export async function setParticipationRestriction(
  profileId: string,
  restricted: boolean,
  reason: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_participation_restriction', {
    p_profile_id: profileId,
    p_restricted: restricted,
    p_reason: reason ?? undefined,
  })
  if (error) throw error
}

export async function fetchMyLpHistory(profileId: string): Promise<MonthlyLpHistoryRow[]> {
  const { data, error } = await supabase
    .from('monthly_lp_history')
    .select('*')
    .eq('profile_id', profileId)
    .order('period', { ascending: false })
    .limit(12)
  if (error) throw error
  return data
}
