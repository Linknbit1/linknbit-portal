import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type XpTransactionRow = Tables<'xp_transactions'>
export type RewardRow = Tables<'rewards'>
export type RewardRedemptionRow = Tables<'reward_redemptions'>
export type QuestRow = Tables<'quests'>
export type QuestProgressRow = Tables<'quest_progress'>

export interface LeaderboardEntry {
  profile_id: string
  name: string
  avatar_url: string | null
  role: string
  service_type: string | null
  xp_total: number
  level: number
}

export interface QuestWithProgress extends QuestRow {
  progress: number
  completed: boolean
  completed_at: string | null
}

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
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function redeemReward(profileId: string, rewardId: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_profile_id: profileId,
    p_reward_id: rewardId,
  })
  if (error) throw error
  return data as string
}

export async function createReward(
  reward: Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity'>,
  createdBy: string,
): Promise<RewardRow> {
  const { data, error } = await supabase
    .from('rewards')
    .insert({ ...reward, created_by: createdBy, is_active: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateReward(
  id: string,
  updates: Partial<Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity' | 'is_active'>>,
): Promise<RewardRow> {
  const { data, error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
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

export async function fetchQuests(): Promise<QuestRow[]> {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('is_active', true)
    .order('xp_reward', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchQuestProgress(profileId: string): Promise<QuestProgressRow[]> {
  const { data, error } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('profile_id', profileId)
  if (error) throw error
  return data
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role, service_type, xp_total, level')
    .eq('is_active', true)
    .not('role', 'in', '("client_owner","client_member")')
    .order('xp_total', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []).map((p) => ({
    profile_id: p.id,
    name: p.name,
    avatar_url: p.avatar_url,
    role: p.role,
    service_type: p.service_type,
    xp_total: p.xp_total,
    level: p.level,
  }))
}

export async function grantXp(
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

export async function startQuest(questId: string): Promise<void> {
  const { error } = await supabase.rpc('start_quest', { p_quest_id: questId })
  if (error) throw error
}

export async function deleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase.from('rewards').delete().eq('id', rewardId)
  if (error) throw error
}

export async function fetchAllQuests(): Promise<QuestRow[]> {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createQuest(
  quest: Pick<QuestRow, 'title' | 'description' | 'xp_reward' | 'condition_type' | 'condition_value' | 'repeatable' | 'is_active'>,
): Promise<QuestRow> {
  const { data, error } = await supabase
    .from('quests')
    .insert(quest)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuest(
  id: string,
  updates: Partial<Pick<QuestRow, 'title' | 'description' | 'xp_reward' | 'condition_type' | 'condition_value' | 'repeatable' | 'is_active'>>,
): Promise<QuestRow> {
  const { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteQuest(questId: string): Promise<void> {
  const { error } = await supabase.from('quests').delete().eq('id', questId)
  if (error) throw error
}
