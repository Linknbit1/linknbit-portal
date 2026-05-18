import { useState } from 'react'
import {
  Trophy, ArrowUp, ArrowDown, Minus, Lock, Zap, Star,
  Plus, X, Gift,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast-context'
import { LEADERBOARD, BADGES, QUESTS, REWARDS, USERS } from '../../data/mock'
import { formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'

/* Per the Gamified Rewards & Recognition System Policy:
   - Standard Shoutout: 100 LP
   - High Impact Shoutout: 120-150 LP
   - LP (Link Points) = coins in this system
   - No negative LP deduction — use participation restriction instead
*/

const MY_COINS = 1240
const SHOUTOUT_CATS = ['Work excellence', 'Helped a teammate', 'Organised an event', 'Shared a great idea', 'Went above & beyond', 'Emergency resolution'] as const

type ShoutoutRecord = {
  id: string
  fromName: string
  toName: string
  category: string
  message: string
  lp: number
  timestamp: string
}

const INITIAL_SHOUTOUTS: ShoutoutRecord[] = [
  { id: 's1', fromName: 'Ghayas', toName: 'Ahmad Karimi', category: 'Work excellence', message: 'Delivered the Cricket Sansar API module 2 days early under heavy load.', lp: 100, timestamp: '2026-05-14T10:00:00' },
  { id: 's2', fromName: 'Sara Qureshi', toName: 'Bilal Ahmed', category: 'Helped a teammate', message: 'Stayed late to finish the Linknbit brand illustrations for client delivery.', lp: 135, timestamp: '2026-05-15T14:30:00' },
]

function ShoutoutModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (s: Partial<ShoutoutRecord>) => void }) {
  const [toId, setToId] = useState('')
  const [category, setCategory] = useState<string>(SHOUTOUT_CATS[0])
  const [message, setMessage] = useState('')
  const [impact, setImpact] = useState<'standard' | 'high'>('standard')

  const employees = USERS.filter((u) => u.role !== 'client_owner' && u.role !== 'client_member' && u.id !== 'u1')
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
            <Select value={toId} onChange={setToId} options={[{ value: '', label: 'Select...' }, ...employees.map((u) => ({ value: u.id, label: u.name }))]} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Category</label>
            <Select value={category} onChange={(v) => setCategory(v)} options={SHOUTOUT_CATS.map((c) => ({ value: c, label: c }))} />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">What they did *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe their specific contribution or impact (required for HR review)..."
              rows={3}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Impact Level</label>
            <div className="flex gap-2">
              {[
                { k: 'standard', label: 'Standard', lp: 100 },
                { k: 'high', label: 'High Impact', lp: 135 },
              ].map(({ k, label, lp }) => (
                <button
                  key={k}
                  onClick={() => setImpact(k as typeof impact)}
                  className={cn(
                    'flex-1 py-2 rounded-md border text-[12.5px] font-ui font-semibold transition-colors',
                    impact === k
                      ? 'bg-coin-gold/15 border-coin-gold/40 text-coin-gold'
                      : 'bg-surface-inset border-border-default text-text-3 hover:text-text-2',
                  )}
                >
                  {label} · {lp} LP
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!toId || message.trim().length < 10} onClick={() => {
            const user = USERS.find((u) => u.id === toId)
            onSave({ toName: user?.name, category, message, lp })
            onClose(); setToId(''); setMessage(''); setImpact('standard')
          }}>
            <Star size={13} /> Give Shoutout
          </Button>
        </div>
      </div>
    </div>
  )
}

function RedeemModal({ reward, coins, onClose, onConfirm }: {
  reward: typeof REWARDS[0] | null; coins: number; onClose: () => void; onConfirm: () => void
}) {
  if (!reward) return null
  const canAfford = coins >= reward.coinCost
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-sm shadow-2xl text-center">
        <span className="text-5xl block mb-3">{reward.icon}</span>
        <h3 className="font-display font-bold text-[17px] text-text-1 mb-1">{reward.name}</h3>
        <p className="font-ui text-[13px] text-text-3 mb-4">{reward.description}</p>
        <p className="font-mono text-[13px] text-coin-gold font-bold mb-5">
          {reward.coinCost} LP required · You have {coins} LP
        </p>
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!canAfford} onClick={onConfirm}>
            <Gift size={13} /> Confirm Redeem
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function GamificationPage() {
  const toast = useToast()
  const [mainTab, setMainTab] = useState('leaderboard')
  const [period, setPeriod] = useState('month')
  const [myCoins, setMyCoins] = useState(MY_COINS)
  const [shoutouts, setShoutouts] = useState<ShoutoutRecord[]>(INITIAL_SHOUTOUTS)
  const [shoutoutOpen, setShoutoutOpen] = useState(false)
  const [redeemTarget, setRedeemTarget] = useState<typeof REWARDS[0] | null>(null)

  const badgeCategories = ['milestone', 'consistency', 'team', 'service', 'special'] as const

  const handleShoutoutSave = (data: Partial<ShoutoutRecord>) => {
    const id = 's' + (shoutouts.length + 1)
    setShoutouts((prev) => [{ id, fromName: 'Ghayas', timestamp: new Date().toISOString(), ...data } as ShoutoutRecord, ...prev])
    toast(`Shoutout sent to ${data.toName} — ${data.lp} LP awarded!`, 'success')
  }

  const handleRedeem = () => {
    if (!redeemTarget) return
    setMyCoins((prev) => prev - redeemTarget.coinCost)
    toast(`"${redeemTarget.name}" redeemed! HR will process your request.`, 'success')
    setRedeemTarget(null)
  }

  const sortedLeaderboard = [...LEADERBOARD].sort((a, b) =>
    period === 'week' ? b.xpThisPeriod - a.xpThisPeriod : b.totalXp - a.totalXp
  )

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Gamification" />

      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">

        {/* Main tabs */}
        <Tabs
          tabs={[
            { key: 'leaderboard', label: 'Leaderboard' },
            { key: 'shoutouts',   label: `Shoutouts (${shoutouts.length})` },
            { key: 'badges',      label: 'Badges' },
            { key: 'quests',      label: 'Quests' },
            { key: 'rewards',     label: 'Rewards Shop' },
          ]}
          activeKey={mainTab}
          onChange={setMainTab}
        />

        {/* ── LEADERBOARD ── */}
        {mainTab === 'leaderboard' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-surface-1 border border-border-default rounded-lg p-1 gap-1">
                {(['week', 'month', 'alltime'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-[12.5px] font-ui font-medium capitalize transition-colors',
                      period === p ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
                    )}
                  >
                    {p === 'alltime' ? 'All Time' : p === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
              <div className="ml-auto">
                <Button size="sm" onClick={() => setShoutoutOpen(true)}>
                  <Star size={13} /> Give Shoutout
                </Button>
              </div>
            </div>

            {/* Podium */}
            <div className="bg-surface-1 border border-border-default rounded-xl py-8 flex items-end justify-center gap-6">
              {[sortedLeaderboard[1], sortedLeaderboard[0], sortedLeaderboard[2]].map((entry, idx) => {
                const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3
                const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' }
                const colors = { 1: 'bg-gradient-to-b from-[#FFD700] to-[#D4A017]', 2: 'bg-gradient-to-b from-[#C0C0C0] to-[#909090]', 3: 'bg-gradient-to-b from-[#CD7F32] to-[#9B5E22]' }
                return (
                  <div key={entry.user.id} className="flex flex-col items-center gap-2">
                    <Avatar name={entry.user.name} size={rank === 1 ? 'xl' : 'lg'} />
                    <div className="text-center">
                      <p className="font-display font-bold text-[13px] text-text-1">{entry.user.name}</p>
                      <p className="font-mono text-[11px] text-coin-gold">{(period === 'week' ? entry.xpThisPeriod : entry.totalXp).toLocaleString()} LP</p>
                    </div>
                    <div className={cn('w-20 rounded-t-lg flex items-end justify-center pb-2', heights[rank as 1|2|3], colors[rank as 1|2|3])}>
                      <span className="font-display font-bold text-[22px] text-white">{rank}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Full table */}
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <div className="grid grid-cols-[40px_auto_1fr_120px_80px_80px_60px] gap-3 px-5 py-2.5 border-b border-border-subtle bg-surface-2">
                {['#', '', 'Name', 'LP This Period', 'Level', 'Badges', 'Δ'].map((h) => (
                  <span key={h} className="font-mono text-[10px] text-text-4 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {sortedLeaderboard.map((entry) => (
                <div
                  key={entry.user.id}
                  className={cn(
                    'grid grid-cols-[40px_auto_1fr_120px_80px_80px_60px] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-white/[0.018] transition-colors',
                    entry.isCurrentUser && 'bg-service-dev/8',
                  )}
                >
                  <span className={cn('font-display font-bold text-[14px]', entry.rank <= 3 ? 'text-coin-gold' : 'text-text-4')}>
                    {entry.rank}
                  </span>
                  <Avatar name={entry.user.name} size="sm" />
                  <div>
                    <p className={cn('font-ui font-semibold text-[13px]', entry.isCurrentUser ? 'text-service-dev' : 'text-text-1')}>
                      {entry.user.name}
                      {entry.isCurrentUser && <span className="ml-2 text-[10px] font-mono text-service-dev">(you)</span>}
                    </p>
                    <p className="text-[11px] font-mono text-text-3 capitalize">{entry.department}</p>
                  </div>
                  <span className="font-mono font-bold text-[13px] text-coin-gold">
                    {(period === 'week' ? entry.xpThisPeriod : entry.totalXp).toLocaleString()}
                  </span>
                  <span className="font-display font-bold text-[13px] text-text-1">Lv {entry.user.level}</span>
                  <span className="font-mono text-[12px] text-text-2">{entry.badgeCount}</span>
                  <span className={cn('flex items-center gap-0.5 text-[12px] font-mono', entry.rankChange > 0 ? 'text-success' : entry.rankChange < 0 ? 'text-error' : 'text-text-4')}>
                    {entry.rankChange > 0 ? <ArrowUp size={11} /> : entry.rankChange < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
                    {Math.abs(entry.rankChange) || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SHOUTOUTS ── */}
        {mainTab === 'shoutouts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11.5px] text-text-3">Only Managers, Team Leads, and HR can issue shoutouts. Each requires a written justification for HR review.</p>
              <Button size="sm" onClick={() => setShoutoutOpen(true)}>
                <Plus size={13} /> Give Shoutout
              </Button>
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
                      <span className="font-mono text-[10px] text-coin-gold bg-coin-gold/12 border border-coin-gold/30 px-1.5 py-[1px] rounded uppercase tracking-wider">+{s.lp} LP</span>
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
                          'bg-surface-1 border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all',
                          badge.locked ? 'border-border-subtle opacity-50' : 'border-border-default hover:border-coin-gold/40',
                        )}
                      >
                        {badge.locked && <Lock size={12} className="absolute top-2 right-2 text-text-4" />}
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
            <div>
              <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-red" /> Active Quests
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {QUESTS.filter((q) => q.status !== 'not_started').map((quest) => {
                  const pct = (quest.progress / quest.total) * 100
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
                      <ProgressBar value={quest.progress} max={quest.total} size="sm" variant={pct >= 60 ? 'warning' : 'default'} className="mb-2" />
                      <div className="flex items-center justify-between font-mono text-[11px] text-text-3">
                        <span>{quest.progress}/{quest.total}</span>
                        <span className="text-coin-gold font-bold">{quest.xpReward} LP</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h3 className="font-display font-semibold text-[15px] text-text-1 mb-3">Available Quests</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUESTS.filter((q) => q.status === 'not_started').map((quest) => (
                  <div key={quest.id} className="bg-surface-1 border border-border-default rounded-xl p-4 flex items-center gap-4 hover:bg-surface-2/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                      <Trophy size={16} className="text-text-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-[13px] text-text-1">{quest.title}</p>
                      <p className="font-ui text-[11.5px] text-text-3 mt-0.5">{quest.description}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 gap-1">
                      <span className="font-mono text-[12px] text-coin-gold font-bold">{quest.xpReward} LP</span>
                      <Button size="sm" variant="secondary" onClick={() => toast(`Quest "${quest.title}" started!`, 'success')}>
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── REWARDS SHOP ── */}
        {mainTab === 'rewards' && (
          <div className="flex flex-col gap-5">
            {/* Balance */}
            <div className="flex items-center gap-4 bg-surface-1 border border-border-default rounded-xl px-6 py-4">
              <div className="w-12 h-12 rounded-xl bg-coin-gold/15 border border-coin-gold/30 flex items-center justify-center">
                <Zap size={20} className="text-coin-gold" />
              </div>
              <div>
                <p className="font-display font-bold text-[28px] text-coin-gold leading-none">{myCoins.toLocaleString()}</p>
                <p className="font-ui text-[12px] text-text-3 mt-0.5">Link Points available · 1 LP = PKR 10</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-[11px] text-text-4">Monthly reset applies</p>
                <p className="font-mono text-[11px] text-text-4">Resets Jun 1</p>
              </div>
            </div>

            {/* Rewards grid */}
            <div className="grid grid-cols-4 gap-4">
              {REWARDS.map((reward) => {
                const canAfford = myCoins >= reward.coinCost
                return (
                  <div
                    key={reward.id}
                    className={cn(
                      'bg-surface-1 border rounded-xl p-5 flex flex-col transition-all',
                      canAfford ? 'border-border-default hover:border-coin-gold/35' : 'border-border-subtle opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[34px]">{reward.icon}</span>
                      {!canAfford && <Lock size={13} className="text-text-4 mt-1" />}
                    </div>
                    <h4 className="font-display font-bold text-[13.5px] text-text-1 mb-1 leading-tight">{reward.name}</h4>
                    <p className="font-ui text-[12px] text-text-3 flex-1 mb-4 leading-relaxed">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn('font-mono font-bold text-[13px]', canAfford ? 'text-coin-gold' : 'text-text-4')}>
                        {reward.coinCost} LP
                      </span>
                      <Button
                        size="sm"
                        variant={canAfford ? 'primary' : 'ghost'}
                        disabled={!canAfford}
                        onClick={() => setRedeemTarget(reward)}
                      >
                        {canAfford ? 'Redeem' : 'Locked'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ShoutoutModal open={shoutoutOpen} onClose={() => setShoutoutOpen(false)} onSave={handleShoutoutSave} />
      <RedeemModal reward={redeemTarget} coins={myCoins} onClose={() => setRedeemTarget(null)} onConfirm={handleRedeem} />
    </div>
  )
}
