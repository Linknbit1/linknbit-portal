import { useState } from 'react'
import { ArrowRight, Building2, Wallet, Trophy } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast-context'
import { usePeople } from '../../hooks/usePeople'
import { useServices } from '../../hooks/useServices'
import { FormField } from './FormField'
import { useBd } from '../../context/BdContext'
import { randomUUID } from '../../lib/uuid'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import type { Lead } from '../../types'

/**
 * BD sells eight fine-grained services; delivery runs three. This is where the
 * two vocabularies meet — a guess the rep can correct rather than a mapping
 * buried in code.
 */
const SERVICE_GUESS: Record<string, string> = {
  'Web Dev': 'development',
  'App Dev': 'development',
  'Workflow Automation': 'development',
  'Business Analysis': 'development',
  'Project Management': 'development',
  'UX/UI Design': 'design',
  Branding: 'design',
  'Digital Marketing': 'marketing',
}

interface HandoffModalProps {
  open: boolean
  lead: Lead | null
  onClose: () => void
}

/**
 * Won-deal handoff to delivery — SRS §3.6.
 *
 * The reason BD lives in this portal rather than a spreadsheet: a won lead
 * becomes a project without anybody retyping the client, the value or the
 * scope. Opens automatically the moment a lead is moved to Won.
 */
export function HandoffModal({ open, lead, onClose }: HandoffModalProps) {
  const toast = useToast()
  const { recordHandoff, viewerName } = useBd()
  const { data: services = [] } = useServices()
  const { data: people = [] } = usePeople()

  const firstGuess = lead?.services.map((s) => SERVICE_GUESS[s]).find(Boolean) ?? 'development'
  const [serviceSlug, setServiceSlug] = useState(firstGuess)
  const [projectName, setProjectName] = useState(lead ? `${lead.company} — ${lead.services[0] ?? 'Project'}` : '')
  const [budget, setBudget] = useState(lead?.value ?? 0)
  const [managerId, setManagerId] = useState('')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState(false)

  if (!lead) return null

  // Only staff who actually run projects should appear as the receiving PM.
  const managers = people.filter(
    (p) => p.is_active && ['project_manager', 'admin', 'super_admin', 'team_lead'].includes(p.role),
  )

  const nameError = touched && !projectName.trim() ? 'Give the project a name' : undefined
  const managerError = touched && !managerId ? 'Somebody has to own the delivery' : undefined

  const submit = () => {
    setTouched(true)
    if (!projectName.trim() || !managerId) return
    const manager = managers.find((m) => m.id === managerId)
    recordHandoff({
      id: randomUUID(),
      leadId: lead.id,
      company: lead.company,
      serviceSlug,
      projectName: projectName.trim(),
      budget,
      managerId,
      managerName: manager?.name ?? '',
      notes: notes.trim() || undefined,
      at: new Date().toISOString(),
      byName: viewerName,
    })
    toast(`${lead.company} handed to ${manager?.name ?? 'delivery'}`, 'success')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-2">
          <Trophy size={15} className="text-success" /> Hand off {lead.company}
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-ui text-[12px] text-text-4">
            The lead stays in BD history, linked to the project it became.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Not yet</Button>
            <Button size="sm" iconLeft={<ArrowRight size={15} />} onClick={submit}>Hand off</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {/* What carries over, stated rather than silently copied. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-success/25 bg-success/5 px-4 py-3">
          <span className="flex items-center gap-2 font-ui text-[13px] text-text-1">
            <Building2 size={14} className="text-text-4" /> {lead.contactName}
            <span className="text-text-4">· {lead.email}</span>
          </span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[13px] text-success">
            <Wallet size={14} /> {formatCompactCurrency(lead.valueEntered, lead.valueCurrency)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            error={nameError}
            className="sm:col-span-2"
          />

          <div>
            <FormField label="Delivery service">
              <Select
                value={serviceSlug}
                onChange={setServiceSlug}
                options={services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))}
              />
            </FormField>
            <p className="mt-1 font-ui text-[11.5px] text-text-4">
              BD sold: {lead.services.join(', ') || '—'}
            </p>
          </div>
          <Input
            label="Budget (PKR)"
            type="number"
            min={0}
            step={50_000}
            value={budget || ''}
            onChange={(e) => setBudget(Number(e.target.value) || 0)}
            helper="Carried from the deal value — edit if the signed figure differs"
          />

          <div className="sm:col-span-2">
            <FormField label="Project manager">
              <Select
                value={managerId}
                onChange={setManagerId}
                placeholder="Choose who picks this up"
                options={managers.map((m) => ({
                value: m.id,
                label: m.name,
                avatar: { name: m.name, url: m.avatar_url },
                }))}
              />
            </FormField>
            {managerError && <p className="mt-1 font-ui text-[11.5px] text-error">{managerError}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="handoff-notes" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Notes for delivery <span className="text-text-4">— optional</span>
          </label>
          <textarea
            id="handoff-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Agreed scope, anything promised in the negotiation, who the day-to-day contact is…"
            className={cn(
              'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
              'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
            )}
          />
        </div>

        {/* States exactly what confirming does. The handoff is saved and linked
            to the lead; turning it into a Delivery project is still a manual
            step, and pretending otherwise would leave someone waiting for a
            project that never appears. */}
        <p className="rounded-md border border-border-subtle bg-surface-2 px-3 py-2 font-ui text-[11.5px] text-text-4">
          Saves the handoff against the lead and puts it on the lead’s timeline. The client and project
          in Delivery are still created there by hand.
        </p>
      </div>
    </Modal>
  )
}
