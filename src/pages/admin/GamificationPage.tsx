import { useState } from 'react'
import {
  Trophy, Zap, Star, Plus, X, Gift, Loader2, AlertCircle,
  Settings, Check, Pencil, Trash2, RefreshCw,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import {
  useLeaderboard,
  useRewards,
  useAllRewards,
  useRedeemReward,
  useCreateReward,
  useUpdateReward,
  useDeleteReward,
  useQuests,
  useAllQuests,
  useQuestProgress,
  useGrantXp,
  useStartQuest,
  useCreateQuest,
  useUpdateQuest,
  useDeleteQuest,
} from '../../hooks/useGamification'
import { BADGES } from '../../data/mock'
import { formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { RewardRow, QuestRow, LeaderboardEntry } from '../../api/gamification'
import type { Json } from '../../types/database'

// ── Types ──────────────────────────────────────────────────────────────────────

type ShoutoutRecord = {
  id: string
  fromName: string
  toName: string
  category: string
  message: string
  lp: number
  timestamp: string
}

const SHOUTOUT_CATS = [
  'Work excellence', 'Helped a teammate', 'Organised an event',
  'Shared a great idea', 'Went above & beyond', 'Emergency resolution',
] as const

const CONDITION_TYPES = [
  { value: 'tasks_completed', label: 'Tasks Completed' },
  { value: 'on_time_streak', label: 'On-Time Streak (days)' },
  { value: 'comments_added', label: 'Comments Added' },
  { value: 'tasks_reviewed', label: 'Tasks Reviewed' },
] as const

const INITIAL_SHOUTOUTS: ShoutoutRecord[] = [
  { id: 's1', fromName: 'Ghayas', toName: 'Ahmad Karimi', category: 'Work excellence', message: 'Delivered the Cricket Sansar API module 2 days early under heavy load.', lp: 100, timestamp: '2026-05-14T10:00:00' },
  { id: 's2', fromName: 'Sara Qureshi', toName: 'Bilal Ahmed', category: 'Helped a teammate', message: 'Stayed late to finish the Linknbit brand illustrations for client delivery.', lp: 135, timestamp: '2026-05-15T14:30:00' },
]

function getQuestTarget(conditionValue: Json): number {
  const cv = conditionValue as Record<string, number>
  return cv['count'] ?? cv['streak_days'] ?? 1
}

function getConditionValueJson(conditionType: string, count: number): Json {
  return conditionType === 'on_time_streak' ? { streak_days: count } : { count }
}

// ── Podium placeholder ─────────────────────────────────────────────────────────

function PodiumSlot({ entry, rank }: { entry: (typeof PODIUM_PLACEHOLDER) | LeaderboardEntry & { rank: number; isCurrentUser: boolean }; rank: 1 | 2 | 3 }) {
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' } as const
  const colors = {
    1: 'bg-gradient-to-b from-[#FFD700] to-[#D4A017]',
    2: 'bg-gradient-to-b from-[#C0C0C0] to-[#909090]',
    3: 'bg-gradient-to-b from-[#CD7F32] to-[#9B5E22]',
  } as const
  const isEmpty = !('name' in entry)

  return (
    <div className="flex flex-col items-center gap-2">
      {isEmpty ? (
        <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center">
          <span className="font-mono text-[12px] text-text-4">?</span>
        </div>
      ) : (
        <Avatar name={entry.name} size={rank === 1 ? 'xl' : 'lg'} />
      )}
      <div className="text-center">
        <p className="font-display font-bold text-[13px] text-text-1">{isEmpty ? '—' : entry.name}</p>
        <p className="font-mono text-[11px] text-coin-gold">{isEmpty ? '0 XP' : `${entry.xp_total.toLocaleString()} XP`}</p>
      </div>
      <div className={cn('w-20 rounded-t-lg flex items-end justify-center pb-2', heights[rank], colors[rank])}>
        <span className="font-display font-bold text-[22px] text-white">{rank}</span>
      </div>
    </div>
  )
}

const PODIUM_PLACEHOLDER = {} as const

// ── Modals ─────────────────────────────────────────────────────────────────────

function ShoutoutModal({ open, onClose, onSave, employees }: {
  open: boolean
  onClose: () => void
  onSave: (s: Partial<ShoutoutRecord>) => void
  employees: LeaderboardEntry[]
}) {
  const [toId, setToId] = useState('')
  const [category, setCategory] = useState<string>(SHOUTOUT_CATS[0])
  const [message, setMessage] = useState('')
  const [impact, setImpact] = useState<'standard' | 'high'>('standard')
  const lp = impact === 'standard' ? 100 : 135

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2">
            <Star size={16} className="text-coin-gold" /> Give Shoutout
          </h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">To Member</label>
            <Select value={toId} onChange={setToId} options={[{ value: '', label: 'Select...' }, ...employees.map((e) => ({ value: e.profile_id, label: e.name }))]} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Category</label>
            <Select value={category} onChange={setCategory} options={SHOUTOUT_CATS.map((c) => ({ value: c, label: c }))} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">What they did *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe their specific contribution or impact..."
              rows={3}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Impact Level</label>
            <div className="flex gap-2">
              {[{ k: 'standard', label: 'Standard', lp: 100 }, { k: 'high', label: 'High Impact', lp: 135 }].map(({ k, label, lp: l }) => (
                <button
                  key={k}
                  onClick={() => setImpact(k as typeof impact)}
                  className={cn(
                    'flex-1 py-2 rounded-md border text-[12.5px] font-ui font-semibold transition-colors',
                    impact === k ? 'bg-coin-gold/15 border-coin-gold/40 text-coin-gold' : 'bg-surface-inset border-border-default text-text-3 hover:text-text-2',
                  )}
                >
                  {label} · {l} XP
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!toId || message.trim().length < 10} onClick={() => {
            const emp = employees.find((e) => e.profile_id === toId)
            onSave({ toName: emp?.name, category, message, lp })
            onClose(); setToId(''); setMessage(''); setImpact('standard')
          }}>
            <Star size={13} /> Give Shoutout
          </Button>
        </div>
      </div>
    </div>
  )
}

function RedeemModal({ reward, myXP, onClose, onConfirm, isPending }: {
  reward: RewardRow | null
  myXP: number
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  if (!reward) return null
  const canAfford = myXP >= reward.xp_cost
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl text-center">
        <div className="w-14 h-14 rounded-xl bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center mx-auto mb-3">
          <Gift size={24} className="text-coin-gold" />
        </div>
        <h3 className="font-display font-bold text-[17px] text-text-1 mb-1">{reward.name}</h3>
        <p className="font-ui text-[13px] text-text-3 mb-4">{reward.description}</p>
        <p className="font-mono text-[13px] text-coin-gold font-bold mb-5">
          {reward.xp_cost.toLocaleString()} XP required · You have {myXP.toLocaleString()} XP
        </p>
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!canAfford || isPending} onClick={onConfirm}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
            {isPending ? 'Processing...' : 'Confirm Redeem'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateRewardModal({ open, onClose, actorId }: {
  open: boolean
  onClose: () => void
  actorId: string
}) {
  const toast = useToast()
  const { mutate: createReward, isPending } = useCreateReward(actorId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [xpCost, setXpCost] = useState('')
  const [quantity, setQuantity] = useState('-1')

  if (!open) return null

  const handleSubmit = () => {
    const cost = parseInt(xpCost, 10)
    const qty = parseInt(quantity, 10)
    if (!name || isNaN(cost) || cost <= 0) return
    createReward(
      { name, description, xp_cost: cost, quantity: isNaN(qty) ? -1 : qty },
      {
        onSuccess: () => {
          toast(`Reward "${name}" created!`, 'success')
          onClose()
          setName(''); setDescription(''); setXpCost(''); setQuantity('-1')
        },
        onError: () => toast('Failed to create reward', 'error'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Create Reward</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Extra Day Off" className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this reward offer?" rows={2} className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">XP Cost *</label>
              <input type="number" min={1} value={xpCost} onChange={(e) => setXpCost(e.target.value)} placeholder="500" className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Qty (-1 = ∞)</label>
              <input type="number" min={-1} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="-1" className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!name || !xpCost || isPending} onClick={handleSubmit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Create Reward
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuestFormModal({ quest, onClose }: {
  quest: QuestRow | null
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: createQuest, isPending: creating } = useCreateQuest()
  const { mutate: updateQuest, isPending: updating } = useUpdateQuest()
  const isEdit = quest !== null

  const [title, setTitle] = useState(quest?.title ?? '')
  const [description, setDescription] = useState(quest?.description ?? '')
  const [xpReward, setXpReward] = useState(String(quest?.xp_reward ?? ''))
  const [conditionType, setConditionType] = useState(quest?.condition_type ?? 'tasks_completed')
  const [conditionCount, setConditionCount] = useState(() => {
    if (!quest) return ''
    const cv = quest.condition_value as Record<string, number>
    return String(cv['count'] ?? cv['streak_days'] ?? '')
  })
  const [repeatable, setRepeatable] = useState(quest?.repeatable ?? false)
  const [isActive, setIsActive] = useState(quest?.is_active ?? true)
  const isPending = creating || updating

  const conditionLabel = conditionType === 'on_time_streak' ? 'Streak Days' : 'Count'

  const handleSubmit = () => {
    const xp = parseInt(xpReward, 10)
    const cnt = parseInt(conditionCount, 10)
    if (!title || isNaN(xp) || xp <= 0 || isNaN(cnt) || cnt <= 0) return

    const payload = {
      title,
      description: description || null,
      xp_reward: xp,
      condition_type: conditionType,
      condition_value: getConditionValueJson(conditionType, cnt),
      repeatable,
      is_active: isActive,
    }

    if (isEdit) {
      updateQuest(
        { id: quest.id, updates: payload },
        {
          onSuccess: () => { toast(`Quest "${title}" updated`, 'success'); onClose() },
          onError: () => toast('Failed to update quest', 'error'),
        },
      )
    } else {
      createQuest(payload, {
        onSuccess: () => { toast(`Quest "${title}" created!`, 'success'); onClose() },
        onError: () => toast('Failed to create quest', 'error'),
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{isEdit ? 'Edit Quest' : 'Create Quest'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Task Crusher" className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What must the employee do?" rows={2} className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">XP Reward *</label>
              <input type="number" min={1} value={xpReward} onChange={(e) => setXpReward(e.target.value)} placeholder="250" className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">{conditionLabel} *</label>
              <input type="number" min={1} value={conditionCount} onChange={(e) => setConditionCount(e.target.value)} placeholder="5" className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Condition Type *</label>
            <Select
              value={conditionType}
              onChange={setConditionType}
              options={CONDITION_TYPES.map((c) => ({ value: c.value, label: c.label }))}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={repeatable} onChange={setRepeatable} />
              <span className="font-ui text-[12.5px] text-text-2">Repeatable</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Toggle checked={isActive} onChange={setIsActive} />
              <span className="font-ui text-[12.5px] text-text-2">Active</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!title || !xpReward || !conditionCount || isPending} onClick={handleSubmit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? 'Save Changes' : 'Create Quest'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function GamificationPage() {
  const toast = useToast()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''
  const myXP = profile?.xp_total ?? 0

  // Feature flags
  const canManageRewards = useCanAccess('can_manage_rewards')
  const canGrantXp = useCanAccess('can_grant_xp')
  const canManageQuests = useCanAccess('can_manage_quests')
  const canGiveShoutout = useCanAccess('can_give_shoutout')
  const isAdmin = canManageRewards || canGrantXp || canManageQuests

  const [mainTab, setMainTab] = useState('leaderboard')
  const [shoutouts, setShoutouts] = useState<ShoutoutRecord[]>(INITIAL_SHOUTOUTS)
  const [shoutoutOpen, setShoutoutOpen] = useState(false)
  const [redeemTarget, setRedeemTarget] = useState<RewardRow | null>(null)
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [questFormTarget, setQuestFormTarget] = useState<QuestRow | null | 'new'>(null)
  const [confirmDeleteReward, setConfirmDeleteReward] = useState<string | null>(null)
  const [confirmDeleteQuest, setConfirmDeleteQuest] = useState<string | null>(null)
  const [grantProfileId, setGrantProfileId] = useState('')
  const [grantAmount, setGrantAmount] = useState('')
  const [grantReason, setGrantReason] = useState('')

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: leaderboard = [], isLoading: lbLoading, error: lbError } = useLeaderboard()
  const { data: rewards = [], isLoading: rwLoading } = useRewards()
  const { data: allRewards = [] } = useAllRewards()
  const { data: quests = [], isLoading: qLoading } = useQuests()
  const { data: allQuests = [] } = useAllQuests()
  const { data: questProgress = [] } = useQuestProgress(profileId)

  // ── Mutations ──────────────────────────────────────────────────────────────────
  const { mutate: redeemReward, isPending: redeemPending } = useRedeemReward(profileId)
  const { mutate: updateReward, isPending: updatingReward } = useUpdateReward()
  const { mutate: deleteReward, isPending: deletingReward } = useDeleteReward()
  const { mutate: grantXp, isPending: grantingXp } = useGrantXp(profileId)
  const { mutate: startQuest, isPending: startingQuest } = useStartQuest(profileId)
  const { mutate: updateQuest, isPending: updatingQuest } = useUpdateQuest()
  const { mutate: deleteQuest, isPending: deletingQuest } = useDeleteQuest()

  // ── Derived data ───────────────────────────────────────────────────────────────
  const badgeCategories = ['milestone', 'consistency', 'team', 'service', 'special'] as const

  const rankedLeaderboard = leaderboard.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
    isCurrentUser: entry.profile_id === profileId,
  }))

  const questsWithProgress = quests.map((quest) => {
    const prog = questProgress.find((p) => p.quest_id === quest.id)
    const target = getQuestTarget(quest.condition_value)
    return {
      ...quest,
      progress: prog?.progress ?? 0,
      completed: prog?.completed ?? false,
      completed_at: prog?.completed_at ?? null,
      started: !!prog,
      target,
    }
  })

  const activeQuests = questsWithProgress.filter((q) => q.started && !q.completed)
  const availableQuests = questsWithProgress.filter((q) => !q.started)
  const completedQuests = questsWithProgress.filter((q) => q.completed)

  // Podium: [2nd, 1st, 3rd] order (middle is tallest)
  const podiumOrder = [rankedLeaderboard[1], rankedLeaderboard[0], rankedLeaderboard[2]]

  // ── Handlers ───────────────────────────────────────────────────────────────────
  const handleShoutoutSave = (data: Partial<ShoutoutRecord>) => {
    const id = 's' + (shoutouts.length + 1)
    setShoutouts((prev) => [{ id, fromName: profile?.name ?? 'You', timestamp: new Date().toISOString(), ...data } as ShoutoutRecord, ...prev])
    toast(`Shoutout sent to ${data.toName} — ${data.lp} XP awarded!`, 'success')
  }

  const handleRedeem = () => {
    if (!redeemTarget) return
    redeemReward(redeemTarget.id, {
      onSuccess: () => {
        toast(`"${redeemTarget.name}" redeemed! HR will process your request.`, 'success')
        setRedeemTarget(null)
      },
      onError: (err) => {
        const msg = err.message.includes('insufficient_xp')
          ? 'Not enough XP'
          : err.message.includes('reward_out_of_stock')
            ? 'This reward is out of stock'
            : 'Redemption failed — please try again'
        toast(msg, 'error')
        setRedeemTarget(null)
      },
    })
  }

  const handleGrantXp = () => {
    const amount = parseInt(grantAmount, 10)
    if (!grantProfileId || isNaN(amount) || amount <= 0 || !grantReason.trim()) return
    grantXp(
      { profileId: grantProfileId, amount, reason: grantReason },
      {
        onSuccess: () => {
          const emp = leaderboard.find((e) => e.profile_id === grantProfileId)
          toast(`${amount} XP granted to ${emp?.name ?? 'employee'}`, 'success')
          setGrantProfileId(''); setGrantAmount(''); setGrantReason('')
        },
        onError: () => toast('Failed to grant XP', 'error'),
      },
    )
  }

  const handleAcceptQuest = (questId: string, questTitle: string) => {
    startQuest(questId, {
      onSuccess: () => toast(`Quest "${questTitle}" accepted! Complete the objective to earn XP.`, 'success'),
      onError: (err) => {
        const msg = err.message.includes('quest_already_started')
          ? 'You already have this quest in progress'
          : err.message.includes('quest_already_completed')
            ? 'You already completed this non-repeatable quest'
            : 'Failed to accept quest'
        toast(msg, 'error')
      },
    })
  }

  const handleDeleteReward = (rewardId: string, rewardName: string) => {
    deleteReward(rewardId, {
      onSuccess: () => { toast(`Reward "${rewardName}" deleted`, 'success'); setConfirmDeleteReward(null) },
      onError: () => { toast('Failed to delete reward', 'error'); setConfirmDeleteReward(null) },
    })
  }

  const handleDeleteQuest = (questId: string, questTitle: string) => {
    deleteQuest(questId, {
      onSuccess: () => { toast(`Quest "${questTitle}" deleted`, 'success'); setConfirmDeleteQuest(null) },
      onError: () => { toast('Failed to delete quest', 'error'); setConfirmDeleteQuest(null) },
    })
  }

  const tabs = [
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'shoutouts',   label: `Shoutouts (${shoutouts.length})` },
    { key: 'badges',      label: 'Badges' },
    { key: 'quests',      label: 'Quests' },
    { key: 'rewards',     label: 'Rewards Shop' },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin' }] : []),
  ]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Gamification" />

      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">
        <Tabs tabs={tabs} activeKey={mainTab} onChange={setMainTab} />

        {/* ── LEADERBOARD ── */}
        {mainTab === 'leaderboard' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11.5px] text-text-3">Ranked by total XP · updates in real-time</p>
              {canGiveShoutout && (
                <Button size="sm" onClick={() => setShoutoutOpen(true)}>
                  <Star size={13} /> Give Shoutout
                </Button>
              )}
            </div>

            {lbLoading && (
              <div className="flex items-center justify-center py-16 text-text-4">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}
            {lbError && (
              <div className="flex items-center gap-2 text-error text-[13px] font-ui py-8 justify-center">
                <AlertCircle size={16} /> Failed to load leaderboard
              </div>
            )}

            {/* Podium — always show when there's at least 1 entry; fill empty slots with placeholders */}
            {!lbLoading && !lbError && rankedLeaderboard.length > 0 && (
              <div className="bg-surface-1 border border-border-default rounded-xl py-8 flex items-end justify-center gap-6">
                {([1, 0, 2] as const).map((dataIdx, i) => {
                  const rank = ([2, 1, 3] as const)[i]
                  const entry = rankedLeaderboard[dataIdx]
                  return (
                    <PodiumSlot
                      key={rank}
                      rank={rank}
                      entry={entry ?? PODIUM_PLACEHOLDER}
                    />
                  )
                })}
              </div>
            )}

            {!lbLoading && !lbError && rankedLeaderboard.length > 0 && (
              <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                <div className="grid grid-cols-[40px_auto_1fr_120px_80px_60px] gap-3 px-5 py-2.5 border-b border-border-subtle bg-surface-2">
                  {['#', '', 'Name', 'Total XP', 'Level', 'Service'].map((h) => (
                    <span key={h} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {rankedLeaderboard.map((entry) => (
                  <div
                    key={entry.profile_id}
                    className={cn(
                      'grid grid-cols-[40px_auto_1fr_120px_80px_60px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-white/[0.018] transition-colors',
                      entry.isCurrentUser && 'bg-service-dev/8',
                    )}
                  >
                    <span className={cn('font-display font-bold text-[14px]', entry.rank <= 3 ? 'text-coin-gold' : 'text-text-4')}>
                      {entry.rank}
                    </span>
                    <Avatar name={entry.name} size="sm" />
                    <div>
                      <p className={cn('font-ui font-semibold text-[13px]', entry.isCurrentUser ? 'text-service-dev' : 'text-text-1')}>
                        {entry.name}
                        {entry.isCurrentUser && <span className="ml-2 text-[10px] font-mono text-service-dev">(you)</span>}
                      </p>
                      <p className="text-[11px] font-mono text-text-3 capitalize">{entry.role.replace(/_/g, ' ')}</p>
                    </div>
                    <span className="font-mono font-bold text-[13px] text-coin-gold flex items-center gap-1">
                      <Zap size={11} /> {entry.xp_total.toLocaleString()}
                    </span>
                    <span className="font-display font-bold text-[13px] text-text-1">Lv {entry.level}</span>
                    <span className={cn(
                      'font-mono text-[10px] px-1.5 py-0.5 rounded-xs capitalize',
                      entry.service_type === 'design' ? 'text-service-design bg-service-design/10' :
                      entry.service_type === 'development' ? 'text-service-dev bg-service-dev/10' :
                      entry.service_type === 'marketing' ? 'text-service-mkt bg-service-mkt/10' :
                      'text-text-4',
                    )}>
                      {entry.service_type ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SHOUTOUTS ── */}
        {mainTab === 'shoutouts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11.5px] text-text-3">Managers, Team Leads, and HR can issue shoutouts. Each requires a written justification for HR review.</p>
              {canGiveShoutout && (
                <Button size="sm" onClick={() => setShoutoutOpen(true)}>
                  <Plus size={13} /> Give Shoutout
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {shoutouts.map((s) => (
                <div key={s.id} className="bg-surface-1 border border-border-default rounded-xl p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center flex-shrink-0">
                    <Star size={16} className="text-coin-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-[14px] text-text-1">{s.toName}</span>
                      <span className="font-mono text-[10px] text-coin-gold bg-coin-gold/12 border border-coin-gold/30 px-1.5 py-[1px] rounded uppercase tracking-wider">+{s.lp} XP</span>
                      <span className="font-mono text-[10px] text-service-design bg-service-design/10 border border-service-design/25 px-1.5 py-[1px] rounded">{s.category}</span>
                    </div>
                    <p className="font-ui text-[13px] text-text-2 mt-1.5 leading-relaxed">"{s.message}"</p>
                    <p className="font-mono text-[11px] text-text-4 mt-1.5">From {s.fromName} · {formatRelativeTime(s.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BADGES ── */}
        {mainTab === 'badges' && (
          <div className="flex flex-col gap-6">
            {badgeCategories.map((cat) => {
              const catBadges = BADGES.filter((b) => b.category === cat)
              if (catBadges.length === 0) return null
              return (
                <div key={cat}>
                  <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3 capitalize flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)} Badges
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {catBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={cn(
                          'bg-surface-1 border rounded-xl p-4 flex flex-col items-center gap-2 text-center relative transition-all',
                          badge.locked ? 'border-border-subtle opacity-50' : 'border-border-default hover:border-coin-gold/40',
                        )}
                      >
                        <span className="text-[32px]">{badge.icon}</span>
                        <p className="font-display font-bold text-[12.5px] text-text-1 leading-tight">{badge.name}</p>
                        <p className="font-ui text-[11px] text-text-3 leading-snug">{badge.description}</p>
                        {badge.earnedAt && (
                          <p className="text-[10px] font-mono text-success">Earned {formatRelativeTime(badge.earnedAt)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── QUESTS ── */}
        {mainTab === 'quests' && (
          <div className="flex flex-col gap-5">
            {qLoading && (
              <div className="flex items-center justify-center py-16 text-text-4">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {!qLoading && activeQuests.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-red" /> In Progress
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {activeQuests.map((quest) => {
                    const pct = Math.min(100, (quest.progress / quest.target) * 100)
                    return (
                      <div
                        key={quest.id}
                        className={cn('bg-surface-1 border rounded-xl p-5 flex flex-col', pct >= 60 ? 'border-coin-gold/35 bg-coin-gold/[0.03]' : 'border-border-default')}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-display font-bold text-[14px] text-text-1 leading-tight">{quest.title}</h4>
                          {pct >= 60 && <span className="text-[9px] bg-coin-gold text-amber-900 font-bold px-1.5 py-0.5 rounded uppercase ml-2 flex-shrink-0">Hot!</span>}
                        </div>
                        <p className="font-ui text-[12.5px] text-text-2 mb-3 leading-snug flex-1">{quest.description}</p>
                        <div className="w-full h-1.5 bg-surface-inset rounded-full overflow-hidden mb-2">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', pct >= 60 ? 'bg-coin-gold' : 'bg-service-dev')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px] text-text-3">
                          <span>{quest.progress}/{quest.target}</span>
                          <span className="text-coin-gold font-bold">+{quest.xp_reward} XP</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!qLoading && completedQuests.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3 flex items-center gap-2">
                  <Check size={14} className="text-success" /> Completed
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {completedQuests.map((quest) => (
                    <div key={quest.id} className="bg-surface-1 border border-success/25 bg-success/[0.03] rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                        <Trophy size={16} className="text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-[13px] text-text-1">{quest.title}</p>
                        <p className="font-mono text-[11px] text-success mt-0.5">+{quest.xp_reward} XP earned</p>
                        {quest.repeatable && (
                          <button
                            disabled={startingQuest}
                            onClick={() => handleAcceptQuest(quest.id, quest.title)}
                            className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-service-dev hover:text-service-dev/80 transition-colors"
                          >
                            <RefreshCw size={10} /> Repeat quest
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!qLoading && availableQuests.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3">Available Quests</h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableQuests.map((quest) => (
                    <div key={quest.id} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4 hover:bg-surface-2/50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                        <Trophy size={16} className="text-text-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-[13px] text-text-1">{quest.title}</p>
                        <p className="font-ui text-[11.5px] text-text-3 mt-0.5">{quest.description}</p>
                        <p className="font-mono text-[10px] text-text-4 mt-0.5">{quest.condition_type.replace(/_/g, ' ')} · {quest.target} required</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="font-mono text-[12px] text-coin-gold font-bold">+{quest.xp_reward} XP</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={startingQuest}
                          onClick={() => handleAcceptQuest(quest.id, quest.title)}
                        >
                          {startingQuest ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!qLoading && quests.length === 0 && (
              <div className="py-16 text-center text-text-4 font-ui text-[13px]">No active quests at the moment.</div>
            )}
          </div>
        )}

        {/* ── REWARDS SHOP ── */}
        {mainTab === 'rewards' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 bg-surface-1 border border-border-default rounded-xl px-6 py-4">
              <div className="w-12 h-12 rounded-xl bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center">
                <Zap size={20} className="text-coin-gold" />
              </div>
              <div>
                <p className="font-display font-bold text-[28px] text-coin-gold leading-none">{myXP.toLocaleString()}</p>
                <p className="font-ui text-[12px] text-text-3 mt-0.5">XP available to spend</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-[11px] text-text-4">Level {profile?.level ?? 1} · All time XP</p>
              </div>
            </div>

            {rwLoading && (
              <div className="flex items-center justify-center py-16 text-text-4">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {!rwLoading && (
              <div className="grid grid-cols-4 gap-4">
                {rewards.map((reward) => {
                  const canAfford = myXP >= reward.xp_cost
                  const isOutOfStock = reward.quantity === 0
                  return (
                    <div
                      key={reward.id}
                      className={cn(
                        'bg-surface-1 border rounded-xl p-5 flex flex-col transition-all',
                        canAfford && !isOutOfStock ? 'border-border-default hover:border-coin-gold/35' : 'border-border-subtle opacity-60',
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                          <Gift size={18} className={canAfford && !isOutOfStock ? 'text-coin-gold' : 'text-text-4'} />
                        </div>
                      </div>
                      <h4 className="font-display font-bold text-[13.5px] text-text-1 mb-1 leading-tight">{reward.name}</h4>
                      <p className="font-ui text-[12px] text-text-3 flex-1 mb-3 leading-relaxed">{reward.description}</p>
                      {reward.quantity !== -1 && reward.quantity !== null && (
                        <p className="font-mono text-[10px] text-text-4 mb-2">{reward.quantity} remaining</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={cn('font-mono font-bold text-[13px]', canAfford && !isOutOfStock ? 'text-coin-gold' : 'text-text-4')}>
                          {reward.xp_cost.toLocaleString()} XP
                        </span>
                        <Button
                          size="sm"
                          variant={canAfford && !isOutOfStock ? 'primary' : 'ghost'}
                          disabled={!canAfford || isOutOfStock}
                          onClick={() => setRedeemTarget(reward)}
                        >
                          {isOutOfStock ? 'Sold Out' : canAfford ? 'Redeem' : 'Locked'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN ── */}
        {mainTab === 'admin' && isAdmin && (
          <div className="flex flex-col gap-8">

            {/* Rewards Management */}
            {canManageRewards && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-[17px] text-text-1 flex items-center gap-2">
                    <Gift size={16} className="text-text-3" /> Rewards Management
                  </h2>
                  <Button size="sm" onClick={() => setCreateRewardOpen(true)}>
                    <Plus size={13} /> Create Reward
                  </Button>
                </div>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_100px_100px_100px_160px] gap-3 px-5 py-2.5 border-b border-border-subtle bg-surface-2">
                    {['Name', 'XP Cost', 'Qty', 'Status', ''].map((h) => (
                      <span key={h} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>
                    ))}
                  </div>
                  {allRewards.map((reward) => (
                    <div key={reward.id} className="grid grid-cols-[1fr_100px_100px_100px_160px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div>
                        <p className="font-ui font-semibold text-[13px] text-text-1">{reward.name}</p>
                        <p className="font-ui text-[11px] text-text-3 line-clamp-1">{reward.description}</p>
                      </div>
                      <span className="font-mono text-[13px] text-coin-gold font-bold">{reward.xp_cost.toLocaleString()}</span>
                      <span className="font-mono text-[12px] text-text-2">
                        {reward.quantity === -1 ? '∞' : reward.quantity ?? '∞'}
                      </span>
                      <span className={cn(
                        'font-mono text-[10px] px-1.5 py-0.5 rounded-xs w-fit',
                        reward.is_active ? 'text-success bg-success/10' : 'text-text-4 bg-surface-2',
                      )}>
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {confirmDeleteReward === reward.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={deletingReward}
                            onClick={() => handleDeleteReward(reward.id, reward.name)}
                            className="font-mono text-[10.5px] text-error hover:text-error/80 font-bold transition-colors"
                          >
                            {deletingReward ? '...' : 'Confirm'}
                          </button>
                          <span className="text-text-4 text-[10px]">/</span>
                          <button onClick={() => setConfirmDeleteReward(null)} className="font-mono text-[10.5px] text-text-3 hover:text-text-1 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updatingReward}
                            onClick={() => updateReward(
                              { id: reward.id, updates: { is_active: !reward.is_active } },
                              { onSuccess: () => toast(`Reward ${reward.is_active ? 'deactivated' : 'activated'}`, 'success') },
                            )}
                          >
                            {reward.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <button
                            onClick={() => setConfirmDeleteReward(reward.id)}
                            className="p-1.5 text-text-4 hover:text-error transition-colors"
                            title="Delete reward"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quest Management */}
            {canManageQuests && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-[17px] text-text-1 flex items-center gap-2">
                    <Trophy size={16} className="text-text-3" /> Quest Management
                  </h2>
                  <Button size="sm" onClick={() => setQuestFormTarget('new')}>
                    <Plus size={13} /> Create Quest
                  </Button>
                </div>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_120px_80px_80px_140px] gap-3 px-5 py-2.5 border-b border-border-subtle bg-surface-2">
                    {['Title', 'XP', 'Condition', 'Status', 'Repeat', ''].map((h) => (
                      <span key={h} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>
                    ))}
                  </div>
                  {allQuests.length === 0 && (
                    <div className="px-5 py-8 text-center text-text-4 font-ui text-[13px]">No quests yet</div>
                  )}
                  {allQuests.map((quest) => (
                    <div key={quest.id} className="grid grid-cols-[1fr_80px_120px_80px_80px_140px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div>
                        <p className="font-ui font-semibold text-[13px] text-text-1">{quest.title}</p>
                        <p className="font-ui text-[11px] text-text-3 line-clamp-1">{quest.description}</p>
                      </div>
                      <span className="font-mono text-[12px] text-coin-gold font-bold">+{quest.xp_reward}</span>
                      <span className="font-mono text-[10.5px] text-text-3">{quest.condition_type.replace(/_/g, ' ')}</span>
                      <span className={cn(
                        'font-mono text-[10px] px-1.5 py-0.5 rounded-xs w-fit',
                        quest.is_active ? 'text-success bg-success/10' : 'text-text-4 bg-surface-2',
                      )}>
                        {quest.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="font-mono text-[10px] text-text-3">{quest.repeatable ? 'Yes' : 'No'}</span>
                      {confirmDeleteQuest === quest.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={deletingQuest}
                            onClick={() => handleDeleteQuest(quest.id, quest.title)}
                            className="font-mono text-[10.5px] text-error hover:text-error/80 font-bold transition-colors"
                          >
                            {deletingQuest ? '...' : 'Confirm'}
                          </button>
                          <span className="text-text-4 text-[10px]">/</span>
                          <button onClick={() => setConfirmDeleteQuest(null)} className="font-mono text-[10.5px] text-text-3 hover:text-text-1 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updatingQuest}
                            onClick={() => updateQuest(
                              { id: quest.id, updates: { is_active: !quest.is_active } },
                              { onSuccess: () => toast(`Quest ${quest.is_active ? 'deactivated' : 'activated'}`, 'success') },
                            )}
                          >
                            {quest.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <button
                            onClick={() => setQuestFormTarget(quest)}
                            className="p-1.5 text-text-3 hover:text-text-1 transition-colors"
                            title="Edit quest"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteQuest(quest.id)}
                            className="p-1.5 text-text-4 hover:text-error transition-colors"
                            title="Delete quest"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Manual XP Grant */}
            {canGrantXp && (
              <section>
                <h2 className="font-display font-bold text-[17px] text-text-1 flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-coin-gold" /> Grant XP
                </h2>
                <div className="bg-surface-1 border border-border-default rounded-xl p-6 max-w-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Employee</label>
                      <Select
                        value={grantProfileId}
                        onChange={setGrantProfileId}
                        options={[
                          { value: '', label: 'Select employee...' },
                          ...leaderboard
                            .filter((e) => e.profile_id !== profileId)
                            .map((e) => ({ value: e.profile_id, label: e.name })),
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">XP Amount *</label>
                        <input
                          type="number"
                          min={1}
                          value={grantAmount}
                          onChange={(e) => setGrantAmount(e.target.value)}
                          placeholder="100"
                          className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason *</label>
                      <textarea
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        placeholder="Describe why this XP is being granted..."
                        rows={2}
                        className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!grantProfileId || !grantAmount || !grantReason.trim() || grantingXp}
                      onClick={handleGrantXp}
                    >
                      {grantingXp ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      Grant XP
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* Settings link for permissions */}
            <div className="flex items-center gap-2 text-[12px] font-ui text-text-4">
              <Settings size={12} />
              Role permissions are managed in <a href="/settings" className="text-service-dev hover:underline">Settings → Permissions</a>
            </div>
          </div>
        )}
      </div>

      {/* ── Portalled Modals ── */}
      <ShoutoutModal
        open={shoutoutOpen}
        onClose={() => setShoutoutOpen(false)}
        onSave={handleShoutoutSave}
        employees={leaderboard.filter((e) => e.profile_id !== profileId)}
      />
      <RedeemModal
        reward={redeemTarget}
        myXP={myXP}
        onClose={() => setRedeemTarget(null)}
        onConfirm={handleRedeem}
        isPending={redeemPending}
      />
      <CreateRewardModal
        open={createRewardOpen}
        onClose={() => setCreateRewardOpen(false)}
        actorId={profileId}
      />
      {questFormTarget !== null && (
        <QuestFormModal
          quest={questFormTarget === 'new' ? null : questFormTarget}
          onClose={() => setQuestFormTarget(null)}
        />
      )}
    </div>
  )
}
