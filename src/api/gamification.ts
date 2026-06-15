import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type XpTransactionRow    = Tables<'xp_transactions'>
export type RewardRow           = Tables<'rewards'>
export type RewardRedemptionRow = Tables<'reward_redemptions'>
export type QuestTaskRow        = Tables<'quest_tasks'>
export type QuestTaskClaimRow   = Tables<'quest_task_claims'>
export type ShoutoutRow         = Tables<'shoutouts'>
export type BadgeRow            = Tables<'badges'>
export type BadgeAwardRow       = Tables<'badge_awards'>
export type MonthlyLpHistoryRow = Tables<'monthly_lp_history'>

export interface LeaderboardEntry {
  profile_id: string
  name: string
  avatar_url: string | null
  role: string
  service_type: string | null
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
    .select('id, name, avatar_url, role, service_type, lp_balance, reputation_total, level, is_restricted')
    .eq('is_active', true)
    .not('role', 'in', '("client_owner","client_member")')
    .order('lp_balance', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []).map((p) => ({
    profile_id: p.id,
    name: p.name,
    avatar_url: p.avatar_url,
    role: p.role,
    service_type: p.service_type,
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

export async function fetchApprovedShoutouts(): Promise<ShoutoutRow[]> {
  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)
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
): Promise<string> {
  const { data, error } = await supabase.rpc('give_shoutout', {
    p_to_profile_id: toProfileId,
    p_category: category,
    p_message: message,
    p_impact: impact,
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

export async function createReward(
  reward: Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity' | 'tier' | 'is_cash'>,
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

export async function deleteReward(id: string): Promise<void> {
  const { error } = await supabase.from('rewards').delete().eq('id', id)
  if (error) throw error
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
