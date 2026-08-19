import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { useToast } from '../../components/ui/toast-context'
import { useBd } from '../../context/BdContext'
import { formatCompactCurrency } from '../../lib/utils'
import type { BdTarget } from '../../types'

interface TargetsModalProps {
  open: boolean
  onClose: () => void
}

/**
 * Quotas for the period, one row per rep.
 *
 * Only the three targets are editable — actuals come from closed deals and
 * logged activity, so they are shown read-only beside each input rather than
 * hidden. Seeing "1.8M of" next to the box is what stops someone setting a
 * target they have already blown past.
 */
export function TargetsModal({ open, onClose }: TargetsModalProps) {
  const toast = useToast()
  const { targets, saveTargets, avatarOf } = useBd()
  const [draft, setDraft] = useState<BdTarget[]>(targets)

  const set = (repId: string, key: keyof BdTarget, value: number) =>
    setDraft((rows) => rows.map((r) => (r.repId === repId ? { ...r, [key]: value } : r)))

  const teamRevenue = draft.reduce((s, t) => s + t.revenueTarget, 0)

  const submit = () => {
    saveTargets(draft)
    toast('Targets updated', 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Set targets — this month"
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-ui text-[12.5px] text-text-3">
            Team revenue target{' '}
            <span className="font-mono text-text-1">{formatCompactCurrency(teamRevenue)}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={submit}>Save targets</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col divide-y divide-border-subtle">
        {draft.map((row) => (
          <div key={row.repId} className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Avatar name={row.repName} src={avatarOf(row.repId)} size="sm" />
              <span className="font-ui text-[13.5px] font-medium text-text-1">{row.repName}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Revenue (PKR)"
                type="number"
                min={0}
                step={100_000}
                value={row.revenueTarget || ''}
                onChange={(e) => set(row.repId, 'revenueTarget', Number(e.target.value) || 0)}
                helper={`${formatCompactCurrency(row.revenueActual)} closed so far`}
              />
              <Input
                label="Outreach"
                type="number"
                min={0}
                step={10}
                value={row.outreachTarget || ''}
                onChange={(e) => set(row.repId, 'outreachTarget', Number(e.target.value) || 0)}
                helper={`${row.outreachActual} sent so far`}
              />
              <Input
                label="Meetings"
                type="number"
                min={0}
                value={row.meetingsTarget || ''}
                onChange={(e) => set(row.repId, 'meetingsTarget', Number(e.target.value) || 0)}
                helper={`${row.meetingsActual} held so far`}
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
