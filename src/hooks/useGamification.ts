import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchXpTransactions,
  fetchRewards,
  fetchAllRewards,
  redeemReward,
  createReward,
  updateReward,
  deleteReward,
  fetchMyRedemptions,
  fetchQuests,
  fetchAllQuests,
  fetchQuestProgress,
  fetchLeaderboard,
  grantXp,
  startQuest,
  createQuest,
  updateQuest,
  deleteQuest,
  type RewardRow,
  type QuestRow,
} from '../api/gamification'

export const GAMIFICATION_KEYS = {
  xpTransactions: (profileId: string) => ['xp_transactions', profileId] as const,
  rewards: () => ['rewards'] as const,
  allRewards: () => ['rewards', 'all'] as const,
  redemptions: (profileId: string) => ['reward_redemptions', profileId] as const,
  quests: () => ['quests'] as const,
  allQuests: () => ['quests', 'all'] as const,
  questProgress: (profileId: string) => ['quest_progress', profileId] as const,
  leaderboard: () => ['leaderboard'] as const,
}

export function useXpTransactions(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.xpTransactions(profileId),
    queryFn: () => fetchXpTransactions(profileId),
    enabled: !!profileId,
  })
}

export function useRewards() {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.rewards(),
    queryFn: fetchRewards,
    staleTime: 60_000,
  })
}

export function useAllRewards() {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.allRewards(),
    queryFn: fetchAllRewards,
    staleTime: 30_000,
  })
}

export function useMyRedemptions(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.redemptions(profileId),
    queryFn: () => fetchMyRedemptions(profileId),
    enabled: !!profileId,
  })
}

export function useRedeemReward(profileId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => redeemReward(profileId, rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.redemptions(profileId) })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.xpTransactions(profileId) })
      // Invalidate leaderboard so XP totals refresh
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

export function useCreateReward(actorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reward: Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity'>) =>
      createReward(reward, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
    },
  })
}

export function useUpdateReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity' | 'is_active'>>
    }) => updateReward(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
    },
  })
}

export function useQuests() {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.quests(),
    queryFn: fetchQuests,
    staleTime: 60_000,
  })
}

export function useQuestProgress(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.questProgress(profileId),
    queryFn: () => fetchQuestProgress(profileId),
    enabled: !!profileId,
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.leaderboard(),
    queryFn: fetchLeaderboard,
    staleTime: 30_000,
  })
}

export function useGrantXp(actorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      profileId,
      amount,
      reason,
    }: {
      profileId: string
      amount: number
      reason: string
    }) => grantXp(profileId, amount, reason, actorId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: GAMIFICATION_KEYS.xpTransactions(variables.profileId),
      })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

export function useStartQuest(profileId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questId: string) => startQuest(questId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questProgress(profileId) })
    },
  })
}

export function useDeleteReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => deleteReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
    },
  })
}

export function useAllQuests() {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.allQuests(),
    queryFn: fetchAllQuests,
    staleTime: 30_000,
  })
}

export function useCreateQuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (quest: Pick<QuestRow, 'title' | 'description' | 'xp_reward' | 'condition_type' | 'condition_value' | 'repeatable' | 'is_active'>) =>
      createQuest(quest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.quests() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allQuests() })
    },
  })
}

export function useUpdateQuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<QuestRow, 'title' | 'description' | 'xp_reward' | 'condition_type' | 'condition_value' | 'repeatable' | 'is_active'>>
    }) => updateQuest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.quests() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allQuests() })
    },
  })
}

export function useDeleteQuest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questId: string) => deleteQuest(questId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.quests() })
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allQuests() })
    },
  })
}
