import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchLeaderboard,
  fetchGamificationParticipants,
  fetchProfileDirectory,
  fetchOpenQuestTasks,
  fetchAllQuestTasks,
  fetchMyClaims,
  fetchClaimsToReview,
  fetchQuestClaimants,
  createQuestTask,
  updateQuestTask,
  deleteQuestTask,
  claimQuestTask,
  submitQuestTask,
  reviewQuestTask,
  fetchApprovedShoutouts,
  fetchPendingShoutouts,
  giveShoutout,
  reviewShoutout,
  fetchRewards,
  fetchAllRewards,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  fetchMyRedemptions,
  fetchRedemptionQueue,
  reviewRedemption,
  fetchBadges,
  fetchMyBadgeAwards,
  awardBadge,
  fetchEmployeeOfMonth,
  setEmployeeOfMonth,
  deleteEmployeeOfMonth,
  fetchXpTransactions,
  fetchPointsLedger,
  grantLp,
  setParticipationRestriction,
  fetchMyLpHistory,
  type QuestTaskRow,
  type RewardRow,
} from '../api/gamification'

export const GAMIFICATION_KEYS = {
  leaderboard:      () => ['leaderboard'] as const,
  directory:        () => ['profile_directory'] as const,
  questTasksOpen:   () => ['quest_tasks', 'open'] as const,
  questTasksAll:    () => ['quest_tasks', 'all'] as const,
  myClaims:         (profileId: string) => ['quest_claims', 'mine', profileId] as const,
  claimsToReview:   () => ['quest_claims', 'review'] as const,
  questClaimants:   () => ['quest_claims', 'claimants'] as const,
  shoutoutsFeed:    () => ['shoutouts', 'approved'] as const,
  shoutoutsPending: () => ['shoutouts', 'pending'] as const,
  rewards:          () => ['rewards'] as const,
  allRewards:       () => ['rewards', 'all'] as const,
  myRedemptions:    (profileId: string) => ['redemptions', 'mine', profileId] as const,
  redemptionQueue:  () => ['redemptions', 'queue'] as const,
  badges:           () => ['badges'] as const,
  myBadges:         (profileId: string) => ['badge_awards', profileId] as const,
  xpTransactions:   (profileId: string) => ['xp_transactions', profileId] as const,
  pointsLedger:     (profileId: string) => ['points_ledger', profileId] as const,
  lpHistory:        (profileId: string) => ['lp_history', profileId] as const,
  employeeOfMonth:  (year: number, month: number) => ['employee_of_month', year, month] as const,
  participants:     () => ['gamification_participants'] as const,
}

// ── Leaderboard & directory ──────────────────────────────────────────────────────

export function useLeaderboard() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.leaderboard(), queryFn: fetchLeaderboard, staleTime: 30_000 })
}

export function useProfileDirectory() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.directory(), queryFn: fetchProfileDirectory, staleTime: 5 * 60_000 })
}

export function useGamificationParticipants() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.participants(), queryFn: fetchGamificationParticipants, staleTime: 30_000 })
}

// ── Quest board ──────────────────────────────────────────────────────────────────

export function useOpenQuestTasks() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.questTasksOpen(), queryFn: fetchOpenQuestTasks, staleTime: 30_000 })
}

export function useAllQuestTasks() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.questTasksAll(), queryFn: fetchAllQuestTasks, staleTime: 30_000 })
}

export function useMyClaims(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.myClaims(profileId),
    queryFn: () => fetchMyClaims(profileId),
    enabled: !!profileId,
  })
}

export function useClaimsToReview() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.claimsToReview(), queryFn: fetchClaimsToReview, staleTime: 15_000 })
}

// Who claimed which quest — identity only, visible to all internal staff.
export function useQuestClaimants() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.questClaimants(), queryFn: fetchQuestClaimants, staleTime: 15_000 })
}

export function useCreateQuestTask(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (task: Pick<QuestTaskRow, 'title' | 'description' | 'difficulty' | 'lp_value' | 'max_claims' | 'requires_proof' | 'deadline'>) =>
      createQuestTask(task, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksOpen() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksAll() })
    },
  })
}

export function useUpdateQuestTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<QuestTaskRow> }) => updateQuestTask(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksOpen() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksAll() })
    },
  })
}

export function useDeleteQuestTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteQuestTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksOpen() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksAll() })
    },
  })
}

export function useClaimQuestTask(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => claimQuestTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.myClaims(profileId) })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questTasksOpen() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questClaimants() })
    },
  })
}

export function useSubmitQuestTask(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ claimId, proofUrl, proofNote }: { claimId: string; proofUrl: string | null; proofNote: string | null }) =>
      submitQuestTask(claimId, proofUrl, proofNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.myClaims(profileId) })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.claimsToReview() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questClaimants() })
    },
  })
}

export function useReviewQuestTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ claimId, approve, note }: { claimId: string; approve: boolean; note: string | null }) =>
      reviewQuestTask(claimId, approve, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.claimsToReview() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.questClaimants() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

// ── Shoutouts ────────────────────────────────────────────────────────────────────

export function useApprovedShoutouts() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.shoutoutsFeed(), queryFn: fetchApprovedShoutouts, staleTime: 30_000 })
}

export function usePendingShoutouts() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.shoutoutsPending(), queryFn: fetchPendingShoutouts, staleTime: 15_000 })
}

export function useGiveShoutout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ toProfileId, category, message, impact }: { toProfileId: string; category: string; message: string; impact: 'standard' | 'high' }) =>
      giveShoutout(toProfileId, category, message, impact),
    onSuccess: () => qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.shoutoutsPending() }),
  })
}

export function useReviewShoutout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note: string | null }) =>
      reviewShoutout(id, approve, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.shoutoutsPending() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.shoutoutsFeed() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

// ── Rewards & redemptions ──────────────────────────────────────────────────────

export function useRewards() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.rewards(), queryFn: fetchRewards, staleTime: 60_000 })
}

export function useAllRewards() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.allRewards(), queryFn: fetchAllRewards, staleTime: 30_000 })
}

export function useCreateReward(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reward: Pick<RewardRow, 'name' | 'description' | 'xp_cost' | 'quantity' | 'tier' | 'is_cash'>) =>
      createReward(reward, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
    },
  })
}

export function useUpdateReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RewardRow> }) => updateReward(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
    },
  })
}

export function useDeleteReward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteReward(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
    },
  })
}

export function useRedeemReward(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => redeemReward(profileId, rewardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.myRedemptions(profileId) })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.redemptionQueue() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

export function useMyRedemptions(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.myRedemptions(profileId),
    queryFn: () => fetchMyRedemptions(profileId),
    enabled: !!profileId,
  })
}

export function useRedemptionQueue() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.redemptionQueue(), queryFn: fetchRedemptionQueue, staleTime: 15_000 })
}

export function useReviewRedemption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approve' | 'reject' | 'fulfill'; note: string | null }) =>
      reviewRedemption(id, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.redemptionQueue() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.rewards() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.allRewards() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

// ── Badges ──────────────────────────────────────────────────────────────────────

export function useBadges() {
  return useQuery({ queryKey: GAMIFICATION_KEYS.badges(), queryFn: fetchBadges, staleTime: 5 * 60_000 })
}

export function useMyBadgeAwards(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.myBadges(profileId),
    queryFn: () => fetchMyBadgeAwards(profileId),
    enabled: !!profileId,
  })
}

export function useAwardBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ badgeId, profileId }: { badgeId: string; profileId: string }) => awardBadge(badgeId, profileId),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.myBadges(vars.profileId) }),
  })
}

// ── Employee of the Month ────────────────────────────────────────────────────────

export function useEmployeeOfMonth(year: number, month: number) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.employeeOfMonth(year, month),
    queryFn: () => fetchEmployeeOfMonth(year, month),
    staleTime: 5 * 60_000,
  })
}

export function useSetEmployeeOfMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ year, month, profileId, note }: { year: number; month: number; profileId: string; note: string | null }) =>
      setEmployeeOfMonth(year, month, profileId, note),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.employeeOfMonth(vars.year, vars.month) })
    },
  })
}

export function useDeleteEmployeeOfMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      deleteEmployeeOfMonth(year, month),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.employeeOfMonth(vars.year, vars.month) })
    },
  })
}

// ── LP ledger, grants, restriction, history ─────────────────────────────────────

export function useXpTransactions(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.xpTransactions(profileId),
    queryFn: () => fetchXpTransactions(profileId),
    enabled: !!profileId,
  })
}

export function usePointsLedger(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.pointsLedger(profileId),
    queryFn: () => fetchPointsLedger(profileId),
    enabled: !!profileId,
  })
}

export function useGrantLp(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, amount, reason }: { profileId: string; amount: number; reason: string }) =>
      grantLp(profileId, amount, reason, actorId),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.xpTransactions(vars.profileId) })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
    },
  })
}

export function useSetRestriction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, restricted, reason }: { profileId: string; restricted: boolean; reason: string | null }) =>
      setParticipationRestriction(profileId, restricted, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.leaderboard() })
      qc.invalidateQueries({ queryKey: GAMIFICATION_KEYS.participants() })
    },
  })
}

export function useMyLpHistory(profileId: string) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.lpHistory(profileId),
    queryFn: () => fetchMyLpHistory(profileId),
    enabled: !!profileId,
  })
}
