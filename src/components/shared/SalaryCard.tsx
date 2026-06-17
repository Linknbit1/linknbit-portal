import { useState } from 'react'
import { Check, Loader2, Lock } from 'lucide-react'
import { useSalary, useUpsertSalary } from '../../hooks/usePeople'
import type { EmployeeSalary } from '../../api/people'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { useToast } from '../ui/toast-context'

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR']

interface SalaryCardProps {
  profileId: string
  /** Copy nuance: 'self' on the user's own profile, 'admin' in the HR drawer. */
  context?: 'self' | 'admin'
}

// Loads the salary then mounts the editable form keyed by the loaded value, so the
// initial state comes from a useState initializer (no setState-in-effect).
export function SalaryCard({ profileId, context = 'self' }: SalaryCardProps) {
  const { data: salary, isLoading } = useSalary(profileId)

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-lg border border-border-default bg-surface-inset" />
  }
  return <SalaryForm key={profileId} profileId={profileId} initial={salary ?? null} context={context} />
}

function SalaryForm({
  profileId,
  initial,
  context,
}: {
  profileId: string
  initial: EmployeeSalary | null
  context: 'self' | 'admin'
}) {
  const toast = useToast()
  const upsert = useUpsertSalary()
  const [amount, setAmount] = useState(initial && initial.amount > 0 ? String(initial.amount) : '')
  const [currency, setCurrency] = useState(initial?.currency ?? 'PKR')

  const parsed = Number(amount)
  const valid = amount.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
  const changed = String(initial?.amount ?? '') !== amount || (initial?.currency ?? 'PKR') !== currency

  const save = async () => {
    if (!valid) return
    try {
      await upsert.mutateAsync({ profileId, amount: parsed, currency })
      toast('Salary saved', 'success')
    } catch {
      toast('Failed to save salary', 'error')
    }
  }

  return (
    <section className="space-y-3.5">
      <div className="flex items-center gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-wider text-text-4">Compensation</h4>
        <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-text-4">
          <Lock size={10} /> {context === 'self' ? 'Only you and HR/Admin can see this' : 'Private — HR/Admin & the employee only'}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2.5">
        <Input
          label="Monthly salary"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="—"
        />
        <div>
          <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-text-4">Currency</label>
          <Select value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </div>
      </div>
      <Button size="sm" variant="secondary" disabled={!valid || !changed || upsert.isPending} onClick={save}>
        {upsert.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save salary
      </Button>
    </section>
  )
}
