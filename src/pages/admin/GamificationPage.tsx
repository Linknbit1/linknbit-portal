import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  Trophy, Zap, Star, Plus, X, Gift, Loader2, AlertCircle, ShieldAlert,
  Check, Pencil, Trash2, ClipboardCheck, Send, Award, Coins, Lock, Ban, History,
  Users, UserPlus, LogOut,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { HubRow } from '../../components/layout/MobileHub'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { Avatar, AvatarGroup } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { DatePicker } from '../../components/ui/DatePicker'
import { useToast } from '../../components/ui/toast-context'
import { useAuthContext } from '../../context/AuthContext'
import {
  canGovernGamification, canRecognize, canFulfillPayouts, canParticipate,
} from '../../lib/gamificationAccess'
import {
  useLeaderboard, useProfileDirectory, useGamificationParticipants,
  useAllQuestTasks, useMyClaims, useClaimsToReview, useQuestClaimants,
  useClaimQuestTask, useSubmitQuestTask, useReviewQuestTask, useReleaseQuestClaim,
  useCreateQuestTask, useUpdateQuestTask, useDeleteQuestTask,
  useApprovedShoutouts, usePendingShoutouts, useGiveShoutout, useReviewShoutout,
  useRewards, useAllRewards, useCreateReward, useUpdateReward, useDeleteReward,
  useRedeemReward, useRedemptionQueue, useReviewRedemption,
  useRewardPools, useOpenRewardPool, useJoinRewardPool, useLeaveRewardPool,
  useCancelRewardPool, useReviewRewardPool,
  useBadges, useMyBadgeAwards,
  useEmployeeOfMonth, useSetEmployeeOfMonth, useDeleteEmployeeOfMonth,
  useGrantLp, useSetRestriction,
} from '../../hooks/useGamification'
import { formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type {
  RewardRow, QuestTaskRow, ShoutoutRow, QuestTaskClaimRow, RewardPoolWithMembers,
} from '../../api/gamification'
import { ModalShell } from '../../components/ui/ModalShell'
import { PointsHistory } from '../../components/shared/PointsHistory'

// ── Constants ────────────────────────────────────────────────────────────────────

const SHOUTOUT_CATS = [
  'Work excellence', 'Helped a teammate', 'Organised an event',
  'Shared a great idea', 'Went above & beyond', 'Emergency resolution',
] as const

const DIFFICULTY_LP: Record<'easy' | 'medium' | 'hard', number> = { easy: 25, medium: 50, hard: 85 }

const DIFFICULTY_META = {
  easy:   { label: 'Easy',   cls: 'text-success bg-success/10' },
  medium: { label: 'Medium', cls: 'text-service-mkt bg-service-mkt/10' },
  hard:   { label: 'Hard',   cls: 'text-brand-red bg-brand-red/10' },
} as const

const asDifficulty = (d: string | null | undefined): 'easy' | 'medium' | 'hard' =>
  d === 'hard' ? 'hard' : d === 'medium' ? 'medium' : 'easy'

const difficultyMeta = (d: string) => DIFFICULTY_META[asDifficulty(d)]

const lp = (n: number) => `${n.toLocaleString()} XP`

// Visual treatment for a claimant's progress on the quest board.
const CLAIM_STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  claimed:   { label: 'In progress', dot: 'bg-service-dev',  text: 'text-service-dev' },
  submitted: { label: 'In review',   dot: 'bg-warning',      text: 'text-warning' },
  approved:  { label: 'Completed',   dot: 'bg-success',      text: 'text-success' },
}
const claimStatusMeta = (s: string) =>
  CLAIM_STATUS_META[s] ?? { label: s, dot: 'bg-text-4', text: 'text-text-3' }

// ── Employee of the Month helpers ──────────────────────────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const monthLabel = (year: number, month: number) => `${MONTH_NAMES[month - 1]} ${year}`

// Previous calendar month relative to now (the spotlight shows last month's winner).
const previousMonth = (d = new Date()): { year: number; month: number } => {
  const m = d.getMonth() // 0-indexed
  return m === 0 ? { year: d.getFullYear() - 1, month: 12 } : { year: d.getFullYear(), month: m }
}

// Last 12 completed months as <Select> options, value "YYYY-MM" (newest first).
const recentMonthOptions = (d = new Date()): { value: string; label: string }[] =>
  Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(d.getFullYear(), d.getMonth() - 1 - i, 1)
    const y = dt.getFullYear()
    const m = dt.getMonth() + 1
    return { value: `${y}-${String(m).padStart(2, '0')}`, label: monthLabel(y, m) }
  })

// ── Leaderboard podium (top 3 by monthly LP) ───────────────────────────────────────

function PodiumSlot({ entry, place }: {
  entry: { name: string; lp_balance: number; isMe: boolean; avatarUrl?: string | null } | null
  place: 1 | 2 | 3
}) {
  const heights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' } as const
  const colors = {
    1: 'from-[#FFD700] to-[#D4A017]',
    2: 'from-[#C0C0C0] to-[#909090]',
    3: 'from-[#CD7F32] to-[#9B5E22]',
  } as const
  return (
    <div className="flex flex-col items-center gap-2 w-24">
      {entry ? (
        <Avatar name={entry.name} src={entry.avatarUrl ?? undefined} size={place === 1 ? 'xl' : 'lg'} />
      ) : (
        <div className="size-10 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center">
          <span className="font-mono text-[12px] text-text-4">?</span>
        </div>
      )}
      <div className="text-center">
        <p className={cn('font-display font-bold text-[13px] truncate w-24', entry?.isMe ? 'text-service-dev' : 'text-text-1')}>{entry?.name ?? '—'}</p>
        <p className="font-mono text-[11px] text-coin-gold">{entry ? `${entry.lp_balance.toLocaleString()} XP` : '0 XP'}</p>
      </div>
      <div className={cn('w-20 rounded-t-lg bg-linear-to-b flex items-end justify-center pb-2', heights[place], colors[place])}>
        <span className="font-display font-bold text-[22px] text-white">{place}</span>
      </div>
    </div>
  )
}

// ── Small shared dialog: confirm with an optional note ─────────────────────────────

function NoteDialog({ open, title, confirmLabel, danger, onClose, onConfirm, isPending }: {
  open: boolean
  title: string
  confirmLabel: string
  danger?: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  isPending: boolean
}) {
  const [note, setNote] = useState('')
  if (!open) return null
  return (
    <ModalShell onClose={onClose} size="sm" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[15px] text-text-1">{title}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)…"
          rows={3}
          className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none mb-4"
        />
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            size="sm" className="flex-1" disabled={isPending}
            variant={danger ? 'secondary' : 'primary'}
            onClick={() => onConfirm(note.trim())}
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {confirmLabel}
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Shoutout modal ─────────────────────────────────────────────────────────────

const CUSTOM_LP_MAX = 500

function ShoutoutModal({ open, onClose, recipients, profileId, canSetCustom }: {
  open: boolean
  onClose: () => void
  recipients: { id: string; name: string; avatarUrl?: string | null }[]
  profileId: string
  canSetCustom: boolean
}) {
  const toast = useToast()
  const { mutate: give, isPending } = useGiveShoutout()
  const [toId, setToId] = useState('')
  const [category, setCategory] = useState<string>(SHOUTOUT_CATS[0])
  const [message, setMessage] = useState('')
  const [impact, setImpact] = useState<'standard' | 'high' | 'custom'>('standard')
  const [customLp, setCustomLp] = useState('')
  if (!open) return null

  const customLpNum = Number(customLp)
  const customLpValid = impact !== 'custom' || (Number.isInteger(customLpNum) && customLpNum >= 1 && customLpNum <= CUSTOM_LP_MAX)

  const submit = () => {
    // For a custom amount the server derives impact from the LP value; send a placeholder impact.
    const isCustom = impact === 'custom'
    give(
      {
        toProfileId: toId, category, message: message.trim(),
        impact: isCustom ? 'standard' : impact,
        lpValue: isCustom ? customLpNum : undefined,
      },
      {
        onSuccess: () => {
          toast('Shoutout submitted — HR will review it before XP is awarded.', 'success')
          onClose(); setToId(''); setMessage(''); setImpact('standard'); setCustomLp('')
        },
        onError: () => toast('Failed to submit shoutout', 'error'),
      },
    )
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2">
            <Star size={16} className="text-coin-gold" /> Give Shoutout
          </h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">To member</label>
            <Select value={toId} onChange={setToId}
              options={[{ value: '', label: 'Select…' }, ...recipients.filter((r) => r.id !== profileId).map((r) => ({ value: r.id, label: r.name, avatar: { name: r.name, url: r.avatarUrl } }))]} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Category</label>
            <Select value={category} onChange={setCategory} options={SHOUTOUT_CATS.map((c) => ({ value: c, label: c }))} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Justification * (HR reviews this)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              placeholder="Describe the specific contribution or impact…"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none" />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Impact level</label>
            <div className="flex gap-2">
              {([['standard', 'Standard', '100 XP'], ['high', 'High Impact', '150 XP'],
                 ...(canSetCustom ? [['custom', 'Custom', 'Set XP'] as const] : [])] as const).map(([k, label, l]) => (
                <button key={k} onClick={() => setImpact(k)}
                  className={cn('flex-1 py-2 rounded-md border text-[12.5px] font-ui font-semibold transition-colors',
                    impact === k ? 'bg-coin-gold/15 border-coin-gold/40 text-coin-gold' : 'bg-surface-inset border-border-default text-text-3 hover:text-text-2')}>
                  {label} · {l}
                </button>
              ))}
            </div>
            {impact === 'custom' && (
              <Input
                type="number" min={1} max={CUSTOM_LP_MAX} value={customLp}
                onChange={(e) => setCustomLp(e.target.value)}
                placeholder={`Enter XP (1–${CUSTOM_LP_MAX})`}
                className="mt-2"
                error={customLp !== '' && !customLpValid ? `Enter a whole number between 1 and ${CUSTOM_LP_MAX}` : undefined}
                helper={customLp === '' ? 'Award an exact XP amount for this recognition (HR reviews before it’s granted).' : undefined}
              />
            )}
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!toId || message.trim().length < 10 || !customLpValid || (impact === 'custom' && customLp === '') || isPending} onClick={submit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />} Submit
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Quest task create/edit modal ───────────────────────────────────────────────

function QuestTaskModal({ task, actorId, onClose }: {
  task: QuestTaskRow | null
  actorId: string
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: create, isPending: creating } = useCreateQuestTask(actorId)
  const { mutate: update, isPending: updating } = useUpdateQuestTask()
  const isEdit = task !== null
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(asDifficulty(task?.difficulty))
  const [lpValue, setLpValue] = useState(String(task?.lp_value ?? DIFFICULTY_LP.easy))
  const [maxClaims, setMaxClaims] = useState(String(task?.max_claims ?? 1))
  const [requiresProof, setRequiresProof] = useState(task?.requires_proof ?? true)
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 10) : '')
  const isPending = creating || updating

  const onDifficulty = (d: string) => {
    const diff = d as 'easy' | 'medium' | 'hard'
    setDifficulty(diff)
    if (!isEdit) setLpValue(String(DIFFICULTY_LP[diff]))
  }

  const submit = () => {
    const lpVal = parseInt(lpValue, 10)
    const mc = parseInt(maxClaims, 10)
    if (!title || isNaN(lpVal) || lpVal <= 0) return
    const payload = {
      title, description: description || null, difficulty, lp_value: lpVal,
      max_claims: isNaN(mc) || mc < 1 ? 1 : mc, requires_proof: requiresProof,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    }
    if (isEdit) {
      update({ id: task.id, updates: payload }, {
        onSuccess: () => { toast('Task updated', 'success'); onClose() },
        onError: () => toast('Failed to update task', 'error'),
      })
    } else {
      create(payload, {
        onSuccess: () => { toast(`Task "${title}" posted`, 'success'); onClose() },
        onError: () => toast('Failed to post task', 'error'),
      })
    }
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{isEdit ? 'Edit Task' : 'Post Quest Task'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Record an office event reel"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What needs to be done?"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Difficulty</label>
              <Select value={difficulty} onChange={onDifficulty} options={[
                { value: 'easy', label: 'Easy (20–30 XP)' },
                { value: 'medium', label: 'Medium (40–60 XP)' },
                { value: 'hard', label: 'Hard (70–100 XP)' },
              ]} />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">XP value *</label>
              <input type="number" min={1} value={lpValue} onChange={(e) => setLpValue(e.target.value)}
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Max claimers</label>
              <input type="number" min={1} value={maxClaims} onChange={(e) => setMaxClaims(e.target.value)}
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Deadline</label>
              <DatePicker value={deadline} onChange={setDeadline} minDate={new Date().toISOString().split('T')[0]} placeholder="No deadline" />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Toggle checked={requiresProof} onChange={setRequiresProof} />
            <span className="font-ui text-[12.5px] text-text-2">Require proof on submission</span>
          </label>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!title || !lpValue || isPending} onClick={submit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {isEdit ? 'Save' : 'Post Task'}
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Submit-proof modal ─────────────────────────────────────────────────────────

function SubmitProofModal({ claim, taskTitle, profileId, onClose }: {
  claim: QuestTaskClaimRow
  taskTitle: string
  profileId: string
  onClose: () => void
}) {
  const toast = useToast()
  const { mutate: submit, isPending } = useSubmitQuestTask(profileId)
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  const onSubmit = () => {
    submit({ claimId: claim.id, proofUrl: url.trim() || null, proofNote: note.trim() || null }, {
      onSuccess: () => { toast('Submitted for review', 'success'); onClose() },
      onError: (e) => toast(e.message.includes('proof_required') ? 'Proof is required for this task' : 'Failed to submit', 'error'),
    })
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[15px] text-text-1">Submit: {taskTitle}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Proof link</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (screenshot, drive, etc.)"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything the reviewer should know…"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none" />
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={isPending} onClick={onSubmit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Reward create modal ────────────────────────────────────────────────────────

function RewardModal({ actorId, onClose }: { actorId: string; onClose: () => void }) {
  const toast = useToast()
  const { mutate: create, isPending } = useCreateReward(actorId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [quantity, setQuantity] = useState('-1')
  const [tier, setTier] = useState<'standard' | 'premium'>('standard')
  const [isCash, setIsCash] = useState(false)
  // Group reward: N employees each contribute the same per-person XP (`cost`).
  const [isGroup, setIsGroup] = useState(false)
  const [groupSize, setGroupSize] = useState('3')

  const perPerson = parseInt(cost, 10)
  const size = parseInt(groupSize, 10)
  const groupSizeValid = !isGroup || (!isNaN(size) && size >= 2)
  const total = !isNaN(perPerson) && !isNaN(size) ? perPerson * size : 0

  const submit = () => {
    const c = parseInt(cost, 10)
    const q = parseInt(quantity, 10)
    if (!name || isNaN(c) || c <= 0 || !groupSizeValid) return
    create({
      name,
      description: description || null,
      xp_cost: c,
      quantity: isNaN(q) ? -1 : q,
      tier,
      // Group rewards go through the pool flow, not the cash-eligibility gate.
      is_cash: isGroup ? false : isCash,
      group_size: isGroup ? size : 1,
    }, {
      onSuccess: () => { toast(`Reward "${name}" created`, 'success'); onClose() },
      onError: () => toast('Failed to create reward', 'error'),
    })
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Create Reward</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1"><X size={18} /></button>
        </div>
        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Extra Casual Leave"
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus" />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none" />
          </div>
          {/* Group reward toggle: requires N employees to pool equal shares. */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Toggle checked={isGroup} onChange={setIsGroup} />
            <span className="font-ui text-[12.5px] text-text-2 flex items-center gap-1.5">
              <Users size={13} className="text-text-3" /> Group reward — several employees pool together
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
                {isGroup ? 'Per-person XP *' : 'XP cost *'}
              </label>
              <input type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="200"
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
            </div>
            {isGroup ? (
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Group size (≥ 2) *</label>
                <input type="number" min={2} value={groupSize} onChange={(e) => setGroupSize(e.target.value)} placeholder="3"
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Qty (-1 = ∞)</label>
                <input type="number" min={-1} value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
              </div>
            )}
          </div>
          {isGroup ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-coin-gold/8 border border-coin-gold/20">
                <Coins size={13} className="text-coin-gold shrink-0" />
                <span className="font-mono text-[12px] text-text-2">
                  Everyone pays <span className="text-coin-gold font-bold">{isNaN(perPerson) ? '—' : lp(perPerson)}</span>
                  {' · total '}<span className="text-coin-gold font-bold">{total ? lp(total) : '—'}</span>
                  {' for '}{groupSizeValid && !isNaN(size) ? size : '—'} people
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Qty — completed groups (-1 = ∞)</label>
                <input type="number" min={-1} value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Tier</label>
                <Select value={tier} onChange={(v) => setTier(v === 'premium' ? 'premium' : 'standard')}
                  options={[{ value: 'standard', label: 'Standard' }, { value: 'premium', label: 'Premium' }]} />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer mt-6">
                <Toggle checked={isCash} onChange={setIsCash} />
                <span className="font-ui text-[12.5px] text-text-2">Cash reward (≥500 XP)</span>
              </label>
            </div>
          )}
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!name || !cost || !groupSizeValid || isPending} onClick={submit}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Redeem confirm modal ───────────────────────────────────────────────────────

function RedeemModal({ reward, myLP, onClose, onConfirm, isPending }: {
  reward: RewardRow | null
  myLP: number
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  if (!reward) return null
  const cashBlocked = reward.is_cash && myLP < 500
  const canAfford = myLP >= reward.xp_cost && !cashBlocked
  return (
    <ModalShell onClose={onClose} size="sm" contentClassName="p-5 sm:p-6">
        <div className="size-14 rounded-xl bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center mx-auto mb-3">
          <Gift size={24} className="text-coin-gold" />
        </div>
        <h3 className="font-display font-bold text-[17px] text-text-1 mb-1">{reward.name}</h3>
        <p className="font-ui text-[13px] text-text-3 mb-4">{reward.description}</p>
        <p className="font-mono text-[13px] text-coin-gold font-bold mb-1">{lp(reward.xp_cost)} · You have {lp(myLP)}</p>
        {reward.is_cash && <p className="font-mono text-[11px] text-text-4 mb-4">Cash rewards need ≥500 XP and HR eligibility approval.</p>}
        <div className="flex gap-2.5 mt-4">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!canAfford || isPending} onClick={onConfirm}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
            {cashBlocked ? 'Need 500 XP' : canAfford ? 'Confirm' : 'Locked'}
          </Button>
        </div>
    </ModalShell>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────────

// Mobile section metadata: drives the hub rows + stack-screen titles.
const GAMIFICATION_SECTIONS = [
  { key: 'leaderboard', label: 'Leaderboard',   icon: Trophy },
  { key: 'board',       label: 'Quest Board',   icon: ClipboardCheck },
  { key: 'shoutouts',   label: 'Shoutouts',     icon: Star },
  { key: 'badges',      label: 'Badges',        icon: Award },
  { key: 'rewards',     label: 'Rewards Shop',  icon: Gift },
  { key: 'history',     label: 'Points History', icon: History },
  { key: 'admin',       label: 'Settings',      icon: ShieldAlert },
] as const

export default function GamificationPage({ mobileSection }: { mobileSection?: string } = {}) {
  const toast = useToast()
  const isDesktop = useIsDesktop()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''
  const role = profile?.role

  const isGovernor = canGovernGamification(role)
  const isRecognizer = canRecognize(role)
  const canFulfill = canFulfillPayouts(role)
  const isParticipant = canParticipate(role)
  const showAdmin = isRecognizer || canFulfill

  const [mainTab, setMainTab] = useState('leaderboard')

  // Modals / dialogs
  const [shoutoutOpen, setShoutoutOpen] = useState(false)
  const [taskModal, setTaskModal] = useState<QuestTaskRow | null | 'new'>(null)
  const [rewardModalOpen, setRewardModalOpen] = useState(false)
  const [redeemTarget, setRedeemTarget] = useState<RewardRow | null>(null)
  const [submitTarget, setSubmitTarget] = useState<QuestTaskClaimRow | null>(null)
  const [review, setReview] = useState<{ kind: 'task' | 'shoutout' | 'redeem' | 'pool'; id: string; approve: boolean; action?: 'approve' | 'reject' | 'fulfill'; label: string; danger?: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmReleaseClaim, setConfirmReleaseClaim] = useState<string | null>(null)

  // Grant LP form
  const [grantId, setGrantId] = useState('')
  const [grantAmount, setGrantAmount] = useState('')
  const [grantReason, setGrantReason] = useState('')

  // Queries
  const { data: leaderboard = [], isLoading: lbLoading, error: lbError } = useLeaderboard()
  const { data: participants = [] } = useGamificationParticipants()
  const { data: directory = {} } = useProfileDirectory()
  const { data: tasks = [], isLoading: tasksLoading } = useAllQuestTasks()
  const { data: myClaims = [] } = useMyClaims(profileId)
  const { data: claimants = [] } = useQuestClaimants()
  const { data: rewards = [], isLoading: rwLoading } = useRewards()
  const { data: badges = [] } = useBadges()
  const { data: myAwards = [] } = useMyBadgeAwards(profileId)
  const { data: shoutFeed = [] } = useApprovedShoutouts()

  // Governance queries (only fetched when the Admin tab is available)
  const { data: claimsReview = [] } = useClaimsToReview()
  const { data: pendingShouts = [] } = usePendingShoutouts()
  const { data: allRewards = [] } = useAllRewards()
  const { data: redemptionQueue = [] } = useRedemptionQueue()
  // Shop: open pools (joinable) + pools I'm already in (pending/approved) so I can track them.
  const { data: shopPools = [] } = useRewardPools(['open', 'pending', 'approved'])
  // HR queue: filled pools awaiting approval, plus approved ones awaiting fulfilment.
  const { data: reviewPools = [] } = useRewardPools(['pending', 'approved'])

  // Mutations
  const { mutate: claimTask, isPending: claiming } = useClaimQuestTask(profileId)
  const { mutate: reviewTask, isPending: reviewingTask } = useReviewQuestTask()
  const { mutate: reviewShout, isPending: reviewingShout } = useReviewShoutout()
  const { mutate: reviewRedeem, isPending: reviewingRedeem } = useReviewRedemption()
  const { mutate: redeem, isPending: redeeming } = useRedeemReward(profileId)
  const { mutate: openPool, isPending: openingPool } = useOpenRewardPool()
  const { mutate: joinPool, isPending: joiningPool } = useJoinRewardPool()
  const { mutate: leavePool, isPending: leavingPool } = useLeaveRewardPool()
  const { mutate: cancelPool, isPending: cancellingPool } = useCancelRewardPool()
  const { mutate: reviewPool, isPending: reviewingPool } = useReviewRewardPool()
  const { mutate: updateReward } = useUpdateReward()
  const { mutate: deleteReward, isPending: deletingReward } = useDeleteReward()
  const { mutate: deleteTask } = useDeleteQuestTask()
  const { mutate: releaseClaim, isPending: releasingClaim } = useReleaseQuestClaim()
  const { mutate: grantLp, isPending: granting } = useGrantLp(profileId)
  const { mutate: setRestriction } = useSetRestriction()

  // Employee of the Month
  const eotmPrev = previousMonth()
  const { data: eotmWinner } = useEmployeeOfMonth(eotmPrev.year, eotmPrev.month)
  const { mutate: setEotm, isPending: settingEotm } = useSetEmployeeOfMonth()
  const { mutate: deleteEotm, isPending: deletingEotm } = useDeleteEmployeeOfMonth()
  const [eotmDeleteOpen, setEotmDeleteOpen] = useState(false)
  const monthOptions = useMemo(() => recentMonthOptions(), [])
  const [eotmForm, setEotmForm] = useState({ period: monthOptions[0].value, profileId: '', note: '' })
  const [eotmSelYear, eotmSelMonth] = eotmForm.period.split('-').map(Number)
  const { data: eotmSelected } = useEmployeeOfMonth(eotmSelYear, eotmSelMonth)

  // Derived
  // Fall back to the auth profile so a restricted user (hidden from the leaderboard)
  // still sees their own LP / reputation on their page.
  const me = leaderboard.find((e) => e.profile_id === profileId)
  const myLP = me?.lp_balance ?? profile?.lp_balance ?? 0
  const myReputation = me?.reputation_total ?? profile?.reputation_total ?? 0
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks])
  const myClaimByTask = useMemo(() => new Map(myClaims.map((c) => [c.task_id, c])), [myClaims])
  // task_id → who claimed it (identity only), for the "Claimed by" rows.
  const claimantsByTask = useMemo(() => {
    const m = new Map<string, typeof claimants>()
    for (const c of claimants) {
      const list = m.get(c.task_id)
      if (list) list.push(c)
      else m.set(c.task_id, [c])
    }
    return m
  }, [claimants])
  const earnedBadgeIds = useMemo(() => new Set(myAwards.map((a) => a.badge_id)), [myAwards])
  const nameOf = (id: string) => directory[id]?.name ?? '—'
  const rewardName = (id: string) => allRewards.find((r) => r.id === id)?.name ?? rewards.find((r) => r.id === id)?.name ?? 'Reward'

  // Split the shop: individual rewards keep the classic redeem flow; group rewards
  // (group_size >= 2) go through the pool section below.
  const individualRewards = useMemo(() => rewards.filter((r) => (r.group_size ?? 1) < 2), [rewards])
  const groupRewards      = useMemo(() => rewards.filter((r) => (r.group_size ?? 1) >= 2), [rewards])
  // reward_id → its active pools (open first, then my pending/approved ones).
  const poolsByReward = useMemo(() => {
    const m = new Map<string, RewardPoolWithMembers[]>()
    for (const p of shopPools) {
      const list = m.get(p.reward_id)
      if (list) list.push(p)
      else m.set(p.reward_id, [p])
    }
    return m
  }, [shopPools])
  const isPoolMember = (p: RewardPoolWithMembers) => p.members.some((mem) => mem.profile_id === profileId)
  const poolBusy = openingPool || joiningPool || leavingPool || cancellingPool

  const ranked = leaderboard.map((e, i) => ({ ...e, rank: i + 1, isMe: e.profile_id === profileId }))
  const reviewCount = claimsReview.length + pendingShouts.length + redemptionQueue.filter((r) => r.status === 'pending').length + reviewPools.filter((p) => p.status === 'pending').length
  // Single render-stable "now" for deadline checks (avoids impure Date.now() in the task loop).
  const nowMs = new Date().getTime()

  // Handlers
  const handleSetEotm = () => {
    if (!eotmForm.profileId) return
    const [y, m] = eotmForm.period.split('-').map(Number)
    setEotm(
      { year: y, month: m, profileId: eotmForm.profileId, note: eotmForm.note.trim() || null },
      {
        onSuccess: () => { toast('Employee of the Month announced 🏆', 'success'); setEotmForm((f) => ({ ...f, profileId: '', note: '' })) },
        onError: () => toast('Could not set Employee of the Month', 'error'),
      },
    )
  }

  const handleDeleteEotm = () => {
    deleteEotm(
      { year: eotmSelYear, month: eotmSelMonth },
      {
        onSuccess: () => { toast('Employee of the Month removed', 'success'); setEotmDeleteOpen(false) },
        onError: () => toast('Could not remove Employee of the Month', 'error'),
      },
    )
  }

  const handleClaim = (taskId: string) => claimTask(taskId, {
    onSuccess: () => toast('Task claimed — complete it, then submit proof.', 'success'),
    onError: (e) => toast(
      e.message.includes('participation_restricted') ? 'You are restricted from claiming tasks'
        : e.message.includes('task_full') ? 'This task is full'
        : e.message.includes('task_expired') ? 'This task has expired'
        : 'Could not claim task', 'error'),
  })

  const handleReleaseClaim = (claimId: string, name: string) => releaseClaim(claimId, {
    onSuccess: () => { toast(`Removed ${name}'s claim`, 'success'); setConfirmReleaseClaim(null) },
    onError: (e) => toast(
      e.message.includes('claim_already_approved') ? 'Approved claims can’t be removed'
        : e.message.includes('forbidden') ? 'You don’t have permission to do this'
        : 'Could not remove claim', 'error'),
  })

  const handleRedeem = () => {
    if (!redeemTarget) return
    redeem(redeemTarget.id, {
      onSuccess: () => { toast(`"${redeemTarget.name}" requested — pending HR approval.`, 'success'); setRedeemTarget(null) },
      onError: (e) => {
        toast(
          e.message.includes('insufficient_lp') ? 'Not enough XP'
            : e.message.includes('cash_threshold') ? 'Cash rewards need ≥500 XP'
            : e.message.includes('out_of_stock') ? 'Out of stock'
            : e.message.includes('restricted') ? 'You are restricted from redeeming'
            : 'Redemption failed', 'error')
        setRedeemTarget(null)
      },
    })
  }

  const poolErr = (e: Error): string =>
    e.message.includes('insufficient_lp') ? 'Not enough XP for your share'
      : e.message.includes('participation_restricted') || e.message.includes('restricted') ? 'You are restricted from redeeming'
      : e.message.includes('already_in_pool') || e.message.includes('already_joined') ? 'You are already in a pool for this reward'
      : e.message.includes('pool_full') ? 'This group is already full'
      : e.message.includes('pool_expired') ? 'This pool has expired'
      : e.message.includes('pool_not_open') ? 'This pool is no longer open'
      : e.message.includes('out_of_stock') ? 'Out of stock'
      : 'Action failed'

  const handleStartPool = (reward: RewardRow) => openPool(reward.id, {
    onSuccess: () => toast(`Group started for "${reward.name}" — your share is reserved.`, 'success'),
    onError: (e) => toast(poolErr(e), 'error'),
  })
  const handleJoinPool = (poolId: string) => joinPool(poolId, {
    onSuccess: () => toast('Joined — your share is reserved.', 'success'),
    onError: (e) => toast(poolErr(e), 'error'),
  })
  const handleLeavePool = (pool: RewardPoolWithMembers) => {
    // The initiator leaving collapses the whole pool (everyone refunded); a regular
    // member just withdraws their own share.
    if (pool.initiated_by === profileId) {
      cancelPool({ poolId: pool.id }, {
        onSuccess: () => toast('Group cancelled — everyone refunded.', 'success'),
        onError: (e) => toast(poolErr(e), 'error'),
      })
    } else {
      leavePool(pool.id, {
        onSuccess: () => toast('You left the group — XP refunded.', 'success'),
        onError: (e) => toast(poolErr(e), 'error'),
      })
    }
  }

  const handleGrant = () => {
    const amt = parseInt(grantAmount, 10)
    if (!grantId || isNaN(amt) || amt <= 0 || !grantReason.trim()) return
    grantLp({ profileId: grantId, amount: amt, reason: grantReason.trim() }, {
      onSuccess: () => { toast(`${amt} XP granted to ${nameOf(grantId)}`, 'success'); setGrantId(''); setGrantAmount(''); setGrantReason('') },
      onError: () => toast('Failed to grant XP', 'error'),
    })
  }

  const runReview = (note: string) => {
    if (!review) return
    const done = (msg: string) => { toast(msg, 'success'); setReview(null) }
    const fail = () => { toast('Action failed', 'error'); setReview(null) }
    if (review.kind === 'task') reviewTask({ claimId: review.id, approve: review.approve, note: note || null }, { onSuccess: () => done(review.approve ? 'Task approved — XP awarded' : 'Sent back for rework'), onError: fail })
    else if (review.kind === 'shoutout') reviewShout({ id: review.id, approve: review.approve, note: note || null }, { onSuccess: () => done(review.approve ? 'Shoutout approved — XP awarded' : 'Shoutout rejected'), onError: fail })
    else if (review.kind === 'redeem') reviewRedeem({ id: review.id, action: review.action ?? 'approve', note: note || null }, { onSuccess: () => done('Redemption updated'), onError: fail })
    else reviewPool({ poolId: review.id, action: review.action ?? 'approve', note: note || null }, { onSuccess: () => done('Group redemption updated'), onError: fail })
  }

  const tabs = [
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'board',       label: 'Quest Board' },
    { key: 'shoutouts',   label: 'Shoutouts' },
    { key: 'badges',      label: 'Badges' },
    { key: 'rewards',     label: 'Rewards Shop' },
    { key: 'history',     label: 'Points History' },
    ...(showAdmin ? [{ key: 'admin', label: `Settings${reviewCount > 0 ? ` (${reviewCount})` : ''}` }] : []),
  ]

  // Mobile: /gamification is a hub of rows; /gamification/:section is one stack screen.
  const showHub = !isDesktop && !mobileSection
  const activeTab = mobileSection ?? mainTab
  const sectionLabel = GAMIFICATION_SECTIONS.find((s) => s.key === mobileSection)?.label ?? 'Gamification'

  const reviewPending = reviewingTask || reviewingShout || reviewingRedeem || reviewingPool

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={mobileSection ? sectionLabel : 'Gamification'} back={mobileSection ? true : undefined} />
      <div className="px-4 py-6 lg:p-6 flex flex-col gap-5 max-w-content mx-auto w-full">
        {/* My LP / reputation summary — hidden on focused section screens */}
        {!mobileSection && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="size-11 rounded-xl bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center"><Coins size={19} className="text-coin-gold" /></div>
            <div><p className="font-display font-bold text-[24px] text-coin-gold leading-none">{myLP.toLocaleString()}</p><p className="font-ui text-[11.5px] text-text-3 mt-0.5">XP · this month</p></div>
          </div>
          <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="size-11 rounded-xl bg-service-design/15 border border-service-design/30 flex items-center justify-center"><Trophy size={19} className="text-service-design" /></div>
            <div><p className="font-display font-bold text-[24px] text-text-1 leading-none">{myReputation.toLocaleString()}</p><p className="font-ui text-[11.5px] text-text-3 mt-0.5">Reputation · Level {me?.level ?? profile?.level ?? 1}</p></div>
          </div>
          <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="size-11 rounded-xl bg-service-dev/15 border border-service-dev/30 flex items-center justify-center"><Award size={19} className="text-service-dev" /></div>
            <div><p className="font-display font-bold text-[24px] text-text-1 leading-none">{earnedBadgeIds.size}</p><p className="font-ui text-[11.5px] text-text-3 mt-0.5">Badges earned</p></div>
          </div>
        </div>
        )}

        {/* Mobile hub list (root) vs desktop tab strip */}
        {showHub ? (
          <div className="flex flex-col gap-2.5">
            {GAMIFICATION_SECTIONS.filter((s) => s.key !== 'admin' || showAdmin).map((s) => (
              <HubRow
                key={s.key}
                to={`/gamification/${s.key}`}
                label={s.label}
                icon={s.icon}
                badge={s.key === 'admin' ? reviewCount : undefined}
              />
            ))}
          </div>
        ) : (
          isDesktop && <Tabs tabs={tabs} activeKey={mainTab} onChange={setMainTab} />
        )}

        {/* ── POINTS HISTORY ── */}
        {!showHub && activeTab === 'history' && (
          <PointsHistory
            myProfileId={profileId}
            isGovernor={isGovernor}
            people={leaderboard}
            selfSummary={{
              name: profile?.name ?? 'You',
              reputation_total: myReputation,
              lp_balance: myLP,
              level: me?.level ?? profile?.level ?? 1,
            }}
          />
        )}

        {/* ── LEADERBOARD ── */}
        {!showHub && activeTab === 'leaderboard' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11.5px] text-text-3">Ranked by Experience Points earned this month · cash rewards go to top performers (≥500 XP)</p>
              {isRecognizer && <Button size="sm" className="shrink-0" onClick={() => setShoutoutOpen(true)}><Star size={13} /> Give Shoutout</Button>}
            </div>

            {/* Employee of the Month — last month's winner, visible to everyone */}
            <div className="bg-linear-to-br from-coin-gold/15 via-surface-1 to-surface-1 border border-coin-gold/40 rounded-xl p-5 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-coin-gold/20 border border-coin-gold/40 flex items-center justify-center text-[26px] shrink-0">🏆</div>
              {eotmWinner ? (
                <>
                  <Avatar name={nameOf(eotmWinner.profile_id)} src={directory[eotmWinner.profile_id]?.avatar_url ?? undefined} size="lg" />
                  <div className="min-w-0">
                    <p className="font-mono text-[10.5px] text-coin-gold uppercase tracking-wider">Employee of the Month · {monthLabel(eotmPrev.year, eotmPrev.month)}</p>
                    <p className="font-display font-bold text-h4/tight text-text-1 truncate">{nameOf(eotmWinner.profile_id)}</p>
                    {eotmWinner.note && <p className="font-ui text-[12.5px] text-text-3 mt-0.5 line-clamp-2">{eotmWinner.note}</p>}
                  </div>
                </>
              ) : (
                <div>
                  <p className="font-mono text-[10.5px] text-coin-gold uppercase tracking-wider">Employee of the Month · {monthLabel(eotmPrev.year, eotmPrev.month)}</p>
                  <p className="font-ui text-[13px] text-text-3 mt-0.5">Not announced yet.</p>
                </div>
              )}
            </div>
            {lbLoading && <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>}
            {lbError && <div className="flex items-center gap-2 text-error text-[13px] py-8 justify-center"><AlertCircle size={16} /> Failed to load leaderboard</div>}

            {/* Podium — top 3 by monthly LP (placeholders fill empty slots) */}
            {!lbLoading && !lbError && ranked.length > 0 && (
              <div className="bg-surface-1 border border-border-default rounded-xl py-8 flex items-end justify-center gap-6">
                {([1, 0, 2] as const).map((dataIdx, i) => {
                  const place = ([2, 1, 3] as const)[i]
                  const e = ranked[dataIdx]
                  return (
                    <PodiumSlot
                      key={place}
                      place={place}
                      entry={e ? { name: e.name, lp_balance: e.lp_balance, isMe: e.isMe, avatarUrl: directory[e.profile_id]?.avatar_url } : null}
                    />
                  )
                })}
              </div>
            )}

            {!lbLoading && !lbError && (
              <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                <div className="hidden lg:grid grid-cols-[40px_1fr_110px_110px_70px] gap-3 px-5 py-2.5 border-b border-border-subtle bg-surface-2">
                  {['#', 'Name', 'XP (month)', 'Reputation', 'Level'].map((h) => <span key={h} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>)}
                </div>
                {ranked.map((e) => (
                  <div key={e.profile_id} className={cn('grid grid-cols-[40px_1fr] gap-3 items-center lg:grid-cols-[40px_1fr_110px_110px_70px] px-4 lg:px-5 py-3 border-b border-border-subtle last:border-0', e.isMe && 'bg-service-dev/8')}>
                    <span className={cn('font-display font-bold text-[14px]', e.rank <= 3 ? 'text-coin-gold' : 'text-text-4')}>{e.rank}</span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={e.name} src={directory[e.profile_id]?.avatar_url ?? undefined} size="sm" />
                      <div className="min-w-0">
                        <p className={cn('font-ui font-semibold text-[13px] truncate', e.isMe ? 'text-service-dev' : 'text-text-1')}>
                          {e.name}{e.isMe && <span className="ml-2 text-[10px] font-mono text-service-dev">(you)</span>}
                          {e.is_restricted && <Ban size={11} className="inline ml-1.5 text-error" aria-label="Restricted" />}
                        </p>
                        <p className="text-[11px] font-mono text-text-3 capitalize">{e.role.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="col-span-2 lg:col-span-1 lg:contents flex flex-wrap items-center gap-x-4 gap-y-1 pl-13 lg:pl-0">
                      <span className="font-mono font-bold text-[13px] text-coin-gold flex items-center gap-1"><Zap size={11} /> {e.lp_balance.toLocaleString()}</span>
                      <span className="font-mono text-[13px] text-text-2">{e.reputation_total.toLocaleString()} <span className="lg:hidden text-text-4 text-[11px]">rep</span></span>
                      <span className="font-display font-bold text-[13px] text-text-1">Lv {e.level}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── QUEST BOARD ── */}
        {!showHub && activeTab === 'board' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11.5px] text-text-3">Claim a task, complete it, then submit proof for approval to earn XP.</p>
              {isRecognizer && <Button size="sm" className="shrink-0" onClick={() => setTaskModal('new')}><Plus size={13} /> Post Task</Button>}
            </div>
            {tasksLoading && <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>}

            {/* My active claims */}
            {myClaims.filter((c) => c.status === 'claimed' || c.status === 'submitted').length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3 flex items-center gap-2"><span className="size-2 rounded-full bg-brand-red" /> My Active Tasks</h3>
                <div className="grid grid-cols-2 gap-3">
                  {myClaims.filter((c) => c.status === 'claimed' || c.status === 'submitted').map((c) => {
                    const t = taskMap.get(c.task_id)
                    return (
                      <div key={c.id} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-[13px] text-text-1">{t?.title ?? 'Task'}</p>
                          <p className="font-mono text-[11px] text-text-3 mt-0.5">{t ? lp(t.lp_value) : ''} · {c.status === 'submitted' ? 'Awaiting review' : 'In progress'}</p>
                        </div>
                        {c.status === 'claimed'
                          ? <Button size="sm" variant="secondary" onClick={() => setSubmitTarget(c)}><Send size={12} /> Submit</Button>
                          : <span className="font-mono text-[10px] text-warning bg-warning/10 px-2 py-1 rounded-xs">Submitted</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Open board */}
            <div>
              <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3">Available Tasks</h3>
              {openTasks.length === 0 && !tasksLoading && <div className="py-12 text-center text-text-4 font-ui text-[13px]">No open tasks right now.</div>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {openTasks.map((t) => {
                  const mine = myClaimByTask.get(t.id)
                  const meta = difficultyMeta(t.difficulty)
                  const claimed = claimantsByTask.get(t.id) ?? []
                  const expired = !!t.deadline && new Date(t.deadline).getTime() < nowMs
                  const full = claimed.length >= t.max_claims
                  const iAmRestricted = profile?.is_restricted ?? false
                  const canClaim = isParticipant && !expired && !full && !iAmRestricted
                  return (
                    <div key={t.id} className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h4 className="font-display font-bold text-body/tight text-text-1">{t.title}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn('font-mono text-[9px] px-1.5 py-0.5 rounded-xs uppercase', meta.cls)}>{meta.label}</span>
                          {isRecognizer && (
                            <button onClick={() => setTaskModal(t)} title="Edit quest" className="p-1 -mr-1 text-text-4 hover:text-text-1 transition-colors"><Pencil size={12} /></button>
                          )}
                        </div>
                      </div>
                      <p className="font-ui text-[12.5px] text-text-2 mb-3 leading-snug flex-1">{t.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[12px] text-coin-gold font-bold">+{lp(t.lp_value)}</span>
                        {mine && (mine.status === 'claimed' || mine.status === 'submitted' || mine.status === 'approved')
                          ? <span className="font-mono text-[10px] text-text-4">{mine.status === 'approved' ? 'Done' : mine.status}</span>
                          : canClaim
                            ? <Button size="sm" disabled={claiming} onClick={() => handleClaim(t.id)}>{claiming ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Claim</Button>
                            : (expired || full || iAmRestricted) && <span className="font-mono text-[10px] text-text-4">{expired ? 'Expired' : full ? 'Full' : 'Restricted'}</span>}
                      </div>
                      {t.deadline && <p className="font-mono text-[10px] text-text-4 mt-2">Due {new Date(t.deadline).toLocaleDateString()}</p>}
                      <div className="mt-3 pt-3 border-t border-border-subtle">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">Claimed by</span>
                          <span className={cn('font-mono text-[10px] shrink-0', claimed.length >= t.max_claims ? 'text-warning' : 'text-text-3')}>
                            {claimed.length} / {t.max_claims} {claimed.length >= t.max_claims ? '· full' : 'slots'}
                          </span>
                        </div>
                        {/* Capacity meter — filled slots vs total */}
                        <div className="flex gap-1 mb-2.5">
                          {Array.from({ length: t.max_claims }).map((_, i) => (
                            <span key={i} className={cn('h-1 flex-1 rounded-full', i < claimed.length ? 'bg-coin-gold' : 'bg-surface-3')} />
                          ))}
                        </div>
                        {claimed.length === 0 ? (
                          <p className="font-ui text-[11px] text-text-4 italic">No one has claimed this yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {claimed.map((c) => {
                              const cs = claimStatusMeta(c.status)
                              return (
                                <li key={c.claim_id} className="flex items-center gap-2">
                                  <Avatar name={c.name} src={c.avatar_url ?? undefined} size="xs" />
                                  <span className="font-ui text-[12px] text-text-2 truncate flex-1">{c.name}</span>
                                  {confirmReleaseClaim === c.claim_id ? (
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      <button disabled={releasingClaim} onClick={() => handleReleaseClaim(c.claim_id, c.name)} className="font-mono text-[10px] text-error font-bold">Remove</button>
                                      <span className="text-text-4 text-[10px]">/</span>
                                      <button onClick={() => setConfirmReleaseClaim(null)} className="font-mono text-[10px] text-text-3">Cancel</button>
                                    </span>
                                  ) : (
                                    <>
                                      <span className={cn('flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-wide shrink-0', cs.text)}>
                                        <span className={cn('size-1.5 rounded-full', cs.dot)} />{cs.label}
                                      </span>
                                      {isRecognizer && c.status !== 'approved' && (
                                        <button onClick={() => setConfirmReleaseClaim(c.claim_id)} title={`Remove ${c.name}'s claim`} className="p-0.5 text-text-4 hover:text-error transition-colors shrink-0"><X size={12} /></button>
                                      )}
                                    </>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── SHOUTOUTS ── */}
        {!showHub && activeTab === 'shoutouts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11.5px] text-text-3">Recognition issued by managers & HR. Each is HR-reviewed before XP is awarded.</p>
              {isRecognizer && <Button size="sm" className="shrink-0" onClick={() => setShoutoutOpen(true)}><Plus size={13} /> Give Shoutout</Button>}
            </div>
            <div className="space-y-3">
              {shoutFeed.length === 0 && <div className="py-12 text-center text-text-4 font-ui text-[13px]">No shoutouts yet.</div>}
              {shoutFeed.map((s: ShoutoutRow) => (
                <div key={s.id} className="bg-surface-1 border border-border-default rounded-xl p-5 flex gap-4">
                  <div className="size-10 rounded-full bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center shrink-0"><Star size={16} className="text-coin-gold" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-[14px] text-text-1">{nameOf(s.to_profile_id)}</span>
                      <span className="font-mono text-[10px] text-coin-gold bg-coin-gold/12 border border-coin-gold/30 px-1.5 py-px rounded uppercase">+{s.lp_value} XP</span>
                      <span className="font-mono text-[10px] text-service-design bg-service-design/10 border border-service-design/25 px-1.5 py-px rounded">{s.category}</span>
                    </div>
                    <p className="font-ui text-body-sm/relaxed text-text-2 mt-1.5">"{s.message}"</p>
                    <p className="font-mono text-[11px] text-text-4 mt-1.5">From {nameOf(s.from_profile_id)} · {formatRelativeTime(s.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BADGES ── */}
        {!showHub && activeTab === 'badges' && (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[11.5px] text-text-3">Badges are earned automatically by hitting milestones — or awarded by HR.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {badges.map((b) => {
                const earned = earnedBadgeIds.has(b.id)
                return (
                  <div key={b.id} className={cn('bg-surface-1 border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all', earned ? 'border-coin-gold/40' : 'border-border-subtle opacity-55')}>
                    <span className="text-[32px]">{b.icon}</span>
                    <p className="font-display font-bold text-[12.5px] text-text-1 leading-tight">{b.name}</p>
                    <p className="font-ui text-label/snug text-text-3">{b.description}</p>
                    {earned
                      ? <span className="font-mono text-[10px] text-success">Earned</span>
                      : <span className="font-mono text-[10px] text-text-4 capitalize">{b.criteria_type === 'manual' ? 'HR award' : `${b.criteria_value} ${b.criteria_type.replace(/_/g, ' ')}`}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── REWARDS SHOP ── */}
        {!showHub && activeTab === 'rewards' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 bg-surface-1 border border-border-default rounded-xl px-6 py-4">
              <div className="size-12 rounded-xl bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center"><Coins size={20} className="text-coin-gold" /></div>
              <div><p className="font-display font-bold text-[28px] text-coin-gold leading-none">{myLP.toLocaleString()}</p><p className="font-ui text-[12px] text-text-3 mt-0.5">XP available · resets monthly</p></div>
              <p className="ml-auto font-mono text-[11px] text-text-4">1 XP = PKR 10</p>
            </div>
            {rwLoading && <div className="flex justify-center py-16 text-text-4"><Loader2 size={20} className="animate-spin" /></div>}
            {!rwLoading && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {individualRewards.map((r) => {
                  const cashBlocked = r.is_cash && myLP < 500
                  const canAfford = myLP >= r.xp_cost && !cashBlocked
                  const out = r.quantity === 0
                  return (
                    <div key={r.id} className={cn('bg-surface-1 border rounded-xl p-5 flex flex-col transition-all', canAfford && !out ? 'border-border-default hover:border-coin-gold/35' : 'border-border-subtle opacity-60')}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="size-10 rounded-lg bg-surface-2 flex items-center justify-center"><Gift size={18} className={canAfford && !out ? 'text-coin-gold' : 'text-text-4'} /></div>
                        {r.tier === 'premium' && <span className="font-mono text-[9px] text-service-design bg-service-design/10 px-1.5 py-0.5 rounded-xs uppercase">Premium</span>}
                      </div>
                      <h4 className="font-display font-bold text-[13.5px] text-text-1 mb-1 leading-tight">{r.name}</h4>
                      <p className="font-ui text-caption/relaxed text-text-3 flex-1 mb-3">{r.description}</p>
                      {r.quantity !== -1 && r.quantity !== null && <p className="font-mono text-[10px] text-text-4 mb-2">{r.quantity} remaining</p>}
                      <div className="flex items-center justify-between">
                        <span className={cn('font-mono font-bold text-[13px]', canAfford && !out ? 'text-coin-gold' : 'text-text-4')}>{lp(r.xp_cost)}</span>
                        <Button size="sm" variant={canAfford && !out ? 'primary' : 'ghost'} disabled={!canAfford || out || !isParticipant} onClick={() => setRedeemTarget(r)}>
                          {out ? 'Sold Out' : cashBlocked ? <><Lock size={11} /> 500 XP</> : canAfford ? 'Redeem' : 'Locked'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Group rewards: several employees pool equal shares ── */}
            {!rwLoading && groupRewards.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-text-3" />
                  <h3 className="font-display font-bold text-[15px] text-text-1">Group Rewards</h3>
                  <span className="font-mono text-[11px] text-text-4">everyone chips in the same XP</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {groupRewards.map((r) => {
                    const perPerson = r.xp_cost
                    const size = r.group_size
                    const pools = poolsByReward.get(r.id) ?? []
                    const openPools = pools.filter((p) => p.status === 'open')
                    const myPool = pools.find((p) => isPoolMember(p))
                    // Show joinable open pools + the viewer's own in-review pool; hide
                    // other people's filled/approved pools from the shop card.
                    const visiblePools = pools.filter((p) => p.status === 'open' || isPoolMember(p))
                    const out = r.quantity === 0
                    const canAffordShare = myLP >= perPerson
                    const inOpenPool = openPools.some((p) => isPoolMember(p))
                    const canStart = isParticipant && canAffordShare && !out && !inOpenPool && !myPool
                    return (
                      <div key={r.id} className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-10 rounded-lg bg-service-design/10 border border-service-design/20 flex items-center justify-center shrink-0"><Users size={18} className="text-service-design" /></div>
                            <div className="min-w-0">
                              <h4 className="font-display font-bold text-body/tight text-text-1 truncate">{r.name}</h4>
                              <p className="font-mono text-[11px] text-text-3">Group of {size} · {lp(perPerson)} each · total {lp(perPerson * size)}</p>
                            </div>
                          </div>
                          {r.quantity !== -1 && r.quantity !== null && (
                            <span className="font-mono text-[10px] text-text-4 shrink-0">{r.quantity} left</span>
                          )}
                        </div>
                        {r.description && <p className="font-ui text-caption/relaxed text-text-3">{r.description}</p>}

                        {/* Active pools for this reward */}
                        {visiblePools.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {visiblePools.map((p) => {
                              const mine = isPoolMember(p)
                              const full = p.members.length >= p.group_size
                              const statusLabel = p.status === 'open'
                                ? `${p.members.length}/${p.group_size} joined`
                                : p.status === 'pending' ? 'Full · awaiting HR'
                                : p.status === 'approved' ? 'Approved' : p.status
                              return (
                                <div key={p.id} className={cn('flex items-center gap-2.5 rounded-md border px-3 py-2', mine ? 'border-service-design/30 bg-service-design/5' : 'border-border-subtle')}>
                                  <AvatarGroup
                                    users={p.members.map((mem) => ({ id: mem.id, name: nameOf(mem.profile_id), avatarUrl: directory[mem.profile_id]?.avatar_url ?? null }))}
                                    max={4}
                                    size="xs"
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-mono text-[11px] text-text-2">{statusLabel}</span>
                                    {mine && <span className="font-mono text-[10px] text-service-design">You're in{p.initiated_by === profileId ? ' · starter' : ''}</span>}
                                  </div>
                                  <div className="ml-auto shrink-0">
                                    {p.status === 'open' && mine && (
                                      <Button size="sm" variant="ghost" disabled={poolBusy} onClick={() => handleLeavePool(p)}>
                                        <LogOut size={12} /> {p.initiated_by === profileId ? 'Cancel' : 'Leave'}
                                      </Button>
                                    )}
                                    {p.status === 'open' && !mine && (
                                      <Button size="sm" variant={isParticipant && canAffordShare && !inOpenPool ? 'primary' : 'ghost'}
                                        disabled={poolBusy || full || !isParticipant || !canAffordShare || inOpenPool || !!myPool}
                                        onClick={() => handleJoinPool(p.id)}>
                                        <UserPlus size={12} /> {canAffordShare ? 'Join' : 'Locked'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-1">
                          <span className={cn('font-mono font-bold text-[13px]', canStart ? 'text-coin-gold' : 'text-text-4')}>{lp(perPerson)} <span className="text-text-4 font-normal">your share</span></span>
                          <Button size="sm" variant={canStart ? 'primary' : 'ghost'} disabled={!canStart || openingPool} onClick={() => handleStartPool(r)}>
                            {out ? 'Sold Out' : inOpenPool || myPool ? 'In a group' : canAffordShare ? <><Plus size={12} /> Start a group</> : 'Locked'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MANAGE (governance) ── */}
        {!showHub && activeTab === 'admin' && showAdmin && (
          <div className="flex flex-col gap-8">

            {/* Task submissions to review */}
            {isRecognizer && (
              <section>
                <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><ClipboardCheck size={16} className="text-text-3" /> Task Submissions ({claimsReview.length})</h2>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  {claimsReview.length === 0 && <div className="px-5 py-8 text-center text-text-4 font-ui text-[13px]">Nothing awaiting review.</div>}
                  {claimsReview.map((c) => {
                    const t = taskMap.get(c.task_id)
                    return (
                      <div key={c.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                        <div className="min-w-0">
                          <p className="font-ui font-semibold text-[13px] text-text-1">{t?.title ?? 'Task'} · <span className="text-coin-gold font-mono">+{t ? lp(t.lp_value) : ''}</span></p>
                          <p className="font-mono text-[11px] text-text-3">{nameOf(c.profile_id)} · {c.proof_url ? <a href={c.proof_url} target="_blank" rel="noreferrer" className="text-service-dev hover:underline">proof ↗</a> : 'no link'} {c.proof_note && `· ${c.proof_note}`}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" disabled={reviewPending} onClick={() => setReview({ kind: 'task', id: c.id, approve: true, label: 'Approve Task' })}>Approve</Button>
                          <Button size="sm" variant="ghost" disabled={reviewPending} onClick={() => setReview({ kind: 'task', id: c.id, approve: false, label: 'Reject Task', danger: true })}>Reject</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Shoutout review (governors only) */}
            {isGovernor && (
              <section>
                <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><Star size={16} className="text-text-3" /> Shoutouts to Review ({pendingShouts.length})</h2>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  {pendingShouts.length === 0 && <div className="px-5 py-8 text-center text-text-4 font-ui text-[13px]">No pending shoutouts.</div>}
                  {pendingShouts.map((s) => (
                    <div key={s.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div className="min-w-0">
                        <p className="font-ui font-semibold text-[13px] text-text-1">{nameOf(s.to_profile_id)} · <span className="text-coin-gold font-mono">+{s.lp_value} XP</span> · <span className="text-text-3">{s.category}</span></p>
                        <p className="font-ui text-[11.5px] text-text-3 italic">"{s.message}" — {nameOf(s.from_profile_id)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" disabled={reviewPending} onClick={() => setReview({ kind: 'shoutout', id: s.id, approve: true, label: 'Approve Shoutout' })}>Approve</Button>
                        <Button size="sm" variant="ghost" disabled={reviewPending} onClick={() => setReview({ kind: 'shoutout', id: s.id, approve: false, label: 'Reject Shoutout', danger: true })}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Redemption queue (governors approve/reject; finance fulfills) */}
            {canFulfill && (
              <section>
                <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><Gift size={16} className="text-text-3" /> Redemption Queue</h2>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  {redemptionQueue.length === 0 && <div className="px-5 py-8 text-center text-text-4 font-ui text-[13px]">No redemptions.</div>}
                  {redemptionQueue.map((r) => (
                    <div key={r.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div className="min-w-0">
                        <p className="font-ui font-semibold text-[13px] text-text-1">{rewardName(r.reward_id)} · <span className="text-coin-gold font-mono">{lp(r.xp_spent)}</span></p>
                        <p className="font-mono text-[11px] text-text-3">{nameOf(r.profile_id)} · <span className="capitalize">{r.status}</span> · {formatRelativeTime(r.created_at)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {r.status === 'pending' && isGovernor && <>
                          <Button size="sm" variant="secondary" disabled={reviewPending} onClick={() => setReview({ kind: 'redeem', id: r.id, approve: true, action: 'approve', label: 'Approve Redemption' })}>Approve</Button>
                          <Button size="sm" variant="ghost" disabled={reviewPending} onClick={() => setReview({ kind: 'redeem', id: r.id, approve: false, action: 'reject', label: 'Reject & Refund', danger: true })}>Reject</Button>
                        </>}
                        {r.status === 'approved' && <Button size="sm" disabled={reviewPending} onClick={() => setReview({ kind: 'redeem', id: r.id, approve: true, action: 'fulfill', label: 'Mark Fulfilled' })}>Fulfill</Button>}
                        {(r.status === 'fulfilled' || r.status === 'rejected') && <span className="font-mono text-[10px] text-text-4 capitalize">{r.status}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Group redemption pools (governors approve/reject; finance fulfills) */}
            {canFulfill && (
              <section>
                <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><Users size={16} className="text-text-3" /> Group Redemption Pools</h2>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  {reviewPools.length === 0 && <div className="px-5 py-8 text-center text-text-4 font-ui text-[13px]">No group pools awaiting action.</div>}
                  {reviewPools.map((p) => (
                    <div key={p.id} className="grid grid-cols-[1fr_auto] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div className="min-w-0">
                        <p className="font-ui font-semibold text-[13px] text-text-1">
                          {rewardName(p.reward_id)} · <span className="text-coin-gold font-mono">{lp(p.per_person_lp)} × {p.group_size} = {lp(p.per_person_lp * p.group_size)}</span>
                        </p>
                        <p className="font-mono text-[11px] text-text-3">
                          {p.members.map((mem) => nameOf(mem.profile_id)).join(', ')} · <span className="capitalize">{p.status}</span> · {formatRelativeTime(p.filled_at ?? p.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {p.status === 'pending' && isGovernor && <>
                          <Button size="sm" variant="secondary" disabled={reviewPending} onClick={() => setReview({ kind: 'pool', id: p.id, approve: true, action: 'approve', label: 'Approve Group Redemption' })}>Approve</Button>
                          <Button size="sm" variant="ghost" disabled={reviewPending} onClick={() => setReview({ kind: 'pool', id: p.id, approve: false, action: 'reject', label: 'Reject & Refund All', danger: true })}>Reject</Button>
                        </>}
                        {p.status === 'approved' && <Button size="sm" disabled={reviewPending} onClick={() => setReview({ kind: 'pool', id: p.id, approve: true, action: 'fulfill', label: 'Mark Group Fulfilled' })}>Fulfill</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quest task management */}
            {isRecognizer && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2"><Trophy size={16} className="text-text-3" /> Quest Tasks</h2>
                  {/* Create from the Quest Board's "Post Task"; this section manages existing tasks. */}
                </div>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  {tasks.length === 0 && <div className="px-5 py-8 text-center text-text-4 font-ui text-[13px]">No tasks yet.</div>}
                  {tasks.map((t) => {
                    const claimed = claimantsByTask.get(t.id) ?? []
                    return (
                    <div key={t.id} className="grid grid-cols-[1fr_90px_80px_140px_120px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div className="min-w-0"><p className="font-ui font-semibold text-[13px] text-text-1 truncate">{t.title}</p><p className="font-mono text-[11px] text-text-3 capitalize">{t.difficulty}</p></div>
                      <span className="font-mono text-[12px] text-coin-gold font-bold">+{lp(t.lp_value)}</span>
                      <span className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded-xs w-fit', t.status === 'open' ? 'text-success bg-success/10' : 'text-text-4 bg-surface-2')}>{t.status}</span>
                      <div className="flex items-center gap-2 min-w-0" title={claimed.map((c) => c.name).join(', ')}>
                        {claimed.length > 0
                          ? <AvatarGroup users={claimed.map((c) => ({ id: c.claim_id, name: c.name, avatarUrl: c.avatar_url }))} max={3} size="xs" />
                          : <span className="font-mono text-[10px] text-text-4">—</span>}
                        <span className="font-mono text-[10px] text-text-3 shrink-0">{claimed.length}/{t.max_claims}</span>
                      </div>
                      {confirmDelete === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { deleteTask(t.id, { onSuccess: () => toast('Task deleted', 'success') }); setConfirmDelete(null) }} className="font-mono text-[10.5px] text-error font-bold">Confirm</button>
                          <span className="text-text-4 text-[10px]">/</span>
                          <button onClick={() => setConfirmDelete(null)} className="font-mono text-[10.5px] text-text-3">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => setTaskModal(t)} className="p-1.5 text-text-3 hover:text-text-1" title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-text-4 hover:text-error" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Rewards management (governors) */}
            {isGovernor && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2"><Gift size={16} className="text-text-3" /> Rewards Catalog</h2>
                  <Button size="sm" onClick={() => setRewardModalOpen(true)}><Plus size={13} /> Create Reward</Button>
                </div>
                <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
                  {allRewards.map((r) => (
                    <div key={r.id} className="grid grid-cols-[1fr_90px_70px_90px_120px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0">
                      <div className="min-w-0"><p className="font-ui font-semibold text-[13px] text-text-1 truncate">{r.name}{r.is_cash && <span className="ml-1.5 font-mono text-[9px] text-service-mkt">CASH</span>}{(r.group_size ?? 1) >= 2 && <span className="ml-1.5 font-mono text-[9px] text-service-design">GROUP ×{r.group_size}</span>}</p></div>
                      <span className="font-mono text-[12px] text-coin-gold font-bold">{lp(r.xp_cost)}</span>
                      <span className="font-mono text-[12px] text-text-2">{r.quantity === -1 ? '∞' : r.quantity ?? '∞'}</span>
                      <span className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded-xs w-fit', r.is_active ? 'text-success bg-success/10' : 'text-text-4 bg-surface-2')}>{r.is_active ? 'Active' : 'Inactive'}</span>
                      {confirmDelete === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <button disabled={deletingReward} onClick={() => { deleteReward(r.id, { onSuccess: () => toast('Reward deleted', 'success') }); setConfirmDelete(null) }} className="font-mono text-[10.5px] text-error font-bold">Confirm</button>
                          <span className="text-text-4 text-[10px]">/</span>
                          <button onClick={() => setConfirmDelete(null)} className="font-mono text-[10.5px] text-text-3">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => updateReward({ id: r.id, updates: { is_active: !r.is_active } }, { onSuccess: () => toast(r.is_active ? 'Deactivated' : 'Activated', 'success') })}>{r.is_active ? 'Disable' : 'Enable'}</Button>
                          <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 text-text-4 hover:text-error" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Grant LP + restriction (governors) */}
            {isGovernor && (
              <section className="grid grid-cols-2 gap-5">
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><Zap size={16} className="text-coin-gold" /> Grant XP</h2>
                  <div className="bg-surface-1 border border-border-default rounded-xl p-5 space-y-3.5">
                    <Select value={grantId} onChange={setGrantId} options={[{ value: '', label: 'Select employee…' }, ...leaderboard.filter((e) => e.profile_id !== profileId).map((e) => ({ value: e.profile_id, label: e.name, avatar: { name: e.name, url: e.avatar_url } }))]} />
                    <input type="number" min={1} value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} placeholder="XP amount"
                      className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus" />
                    <textarea value={grantReason} onChange={(e) => setGrantReason(e.target.value)} rows={2} placeholder="Reason *"
                      className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 outline-none focus:border-border-focus resize-none" />
                    <Button size="sm" disabled={!grantId || !grantAmount || !grantReason.trim() || granting} onClick={handleGrant}>
                      {granting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} Grant XP
                    </Button>
                  </div>
                </div>
                <div>
                  <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><ShieldAlert size={16} className="text-error" /> Participation</h2>
                  <p className="font-mono text-[10.5px] text-text-4 mb-3">Excluded members are hidden from the leaderboard entirely. You can exclude yourself too.</p>
                  <div className="bg-surface-1 border border-border-default rounded-xl p-5 space-y-2 max-h-65 overflow-y-auto">
                    {participants.map((e) => (
                      <div key={e.profile_id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <Avatar name={e.name} src={e.avatar_url ?? undefined} size="xs" />
                          <span className="font-ui text-[12.5px] text-text-2 truncate">{e.name}{e.profile_id === profileId && ' (you)'}</span>
                        </span>
                        <button
                          onClick={() => setRestriction({ profileId: e.profile_id, restricted: !e.is_restricted, reason: e.is_restricted ? null : 'Disciplinary' }, { onSuccess: () => toast(e.is_restricted ? 'Participation restored' : 'Excluded from gamification', 'success') })}
                          className={cn('font-mono text-[10.5px] px-2 py-1 rounded-xs flex items-center gap-1 shrink-0', e.is_restricted ? 'text-error bg-error/10' : 'text-text-3 hover:text-error')}
                        >
                          <Ban size={11} /> {e.is_restricted ? 'Excluded' : 'Exclude'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Employee of the Month (governors) */}
            {isGovernor && (
              <section>
                <h2 className="font-display font-bold text-[16px] text-text-1 flex items-center gap-2 mb-3"><Trophy size={16} className="text-coin-gold" /> Employee of the Month</h2>
                <div className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Month</label>
                      <Select value={eotmForm.period} onChange={(v) => setEotmForm((f) => ({ ...f, period: v }))} options={monthOptions} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Employee</label>
                      <Select value={eotmForm.profileId} onChange={(v) => setEotmForm((f) => ({ ...f, profileId: v }))}
                        options={[{ value: '', label: 'Select employee…' }, ...leaderboard.map((e) => ({ value: e.profile_id, label: e.name, avatar: { name: e.name, url: e.avatar_url } }))]} />
                    </div>
                  </div>
                  <Input label="Citation (optional)" value={eotmForm.note} onChange={(e) => setEotmForm((f) => ({ ...f, note: e.target.value }))} placeholder="Why they earned it…" />

                  {/* Current winner for the selected month — edit (prefill) or remove a mistake. */}
                  {eotmSelected && (
                    eotmDeleteOpen ? (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-error/30 bg-error/5 px-3 py-2.5">
                        <span className="font-ui text-[12px] text-text-2">Remove {nameOf(eotmSelected.profile_id)} as winner for {monthLabel(eotmSelYear, eotmSelMonth)}?</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEotmDeleteOpen(false)} className="font-mono text-[10.5px] text-text-3">Cancel</button>
                          <button onClick={handleDeleteEotm} disabled={deletingEotm} className="font-mono text-[10.5px] font-bold text-error">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-inset px-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={nameOf(eotmSelected.profile_id)} src={directory[eotmSelected.profile_id]?.avatar_url ?? undefined} size="sm" />
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-coin-gold uppercase tracking-wider">Winner · {monthLabel(eotmSelYear, eotmSelMonth)}</p>
                            <p className="font-ui text-[12.5px] font-semibold text-text-1 truncate">{nameOf(eotmSelected.profile_id)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setEotmForm((f) => ({ ...f, profileId: eotmSelected.profile_id, note: eotmSelected.note ?? '' }))}
                            className="flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[10.5px] text-text-3 hover:text-text-1" title="Edit">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => setEotmDeleteOpen(true)}
                            className="flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[10.5px] text-text-4 hover:text-error" title="Remove">
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  <div className="flex justify-end">
                    <Button size="sm" disabled={!eotmForm.profileId || settingEotm} onClick={handleSetEotm}>
                      {settingEotm ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />} {eotmSelected ? 'Save winner' : 'Announce winner'}
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ShoutoutModal open={shoutoutOpen} onClose={() => setShoutoutOpen(false)} recipients={leaderboard.map((e) => ({ id: e.profile_id, name: e.name, avatarUrl: e.avatar_url }))} profileId={profileId} canSetCustom={isRecognizer} />
      {taskModal !== null && <QuestTaskModal task={taskModal === 'new' ? null : taskModal} actorId={profileId} onClose={() => setTaskModal(null)} />}
      {rewardModalOpen && <RewardModal actorId={profileId} onClose={() => setRewardModalOpen(false)} />}
      {submitTarget && <SubmitProofModal claim={submitTarget} taskTitle={taskMap.get(submitTarget.task_id)?.title ?? 'Task'} profileId={profileId} onClose={() => setSubmitTarget(null)} />}
      <RedeemModal reward={redeemTarget} myLP={myLP} onClose={() => setRedeemTarget(null)} onConfirm={handleRedeem} isPending={redeeming} />
      <NoteDialog open={review !== null} title={review?.label ?? ''} confirmLabel={review?.label ?? 'Confirm'} danger={review?.danger} onClose={() => setReview(null)} onConfirm={runReview} isPending={reviewPending} />
    </div>
  )
}

/** Mobile-only /gamification/:section stack screen; redirects on desktop. */
export function GamificationSectionScreen() {
  const isDesktop = useIsDesktop()
  const { section } = useParams()
  const valid = GAMIFICATION_SECTIONS.some((s) => s.key === section)
  if (isDesktop || !section || !valid) return <Navigate to="/gamification" replace />
  return <GamificationPage mobileSection={section} />
}
