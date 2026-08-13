import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER, STAGE_CONFIG, STAGE_ORDER } from '../../constants/bd'
import { FormField } from './FormField'
import { useBd } from '../../context/BdPrototypeContext'
import { randomUUID } from '../../lib/uuid'
import { BD_REPS } from '../../data/bdMock'
import { cn } from '../../lib/cn'
import type { Lead, LeadStage, BdChannel, LeadTemperature, IcpFit } from '../../types'

/**
 * Services the BD team sells. Finer-grained than delivery's three service types
 * on purpose — a prospect asks for "branding", not for "design" — and mapped
 * down to a delivery service only at handoff.
 */
const SERVICES = [
  'Web Dev', 'App Dev', 'UX/UI Design', 'Branding',
  'Digital Marketing', 'Project Management', 'Business Analysis', 'Workflow Automation',
]

const TEMPERATURES: { value: LeadTemperature; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

const ICP_FITS: { value: IcpFit; label: string }[] = [
  { value: 'strong', label: 'Strong fit' },
  { value: 'partial', label: 'Partial fit' },
  { value: 'none', label: 'Not a fit' },
]

const INDUSTRIES = [
  'Logistics', 'Healthcare', 'Manufacturing', 'Retail / FMCG', 'Professional Services',
  'Education', 'Energy', 'Real Estate', 'SaaS', 'Fitness & Wellness', 'Automotive', 'Other',
]

function emptyLead(ownerId: string, ownerName: string): Lead {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: randomUUID(),
    company: '', contactName: '', contactTitle: '', email: '', phone: '',
    channel: 'linkedin', services: [], industry: 'Logistics', icpFit: 'partial',
    value: 0, stage: 'new', temperature: 'warm',
    ownerId, ownerName,
    addedOn: today, lastContacted: today, nextFollowUp: null,
    activityCount: 0,
  }
}

interface LeadFormModalProps {
  open: boolean
  /** Null creates a new lead. */
  lead: Lead | null
  onClose: () => void
}

export function LeadFormModal({ open, lead, onClose }: LeadFormModalProps) {
  const toast = useToast()
  const { saveLead, viewerRepId, viewerName } = useBd()
  const [draft, setDraft] = useState<Lead>(() => lead ?? emptyLead(viewerRepId, viewerName))
  const [touched, setTouched] = useState(false)

  // Remount per lead (key on the caller) keeps this simple: no effect syncing.
  const set = <K extends keyof Lead>(key: K, value: Lead[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const companyError = touched && !draft.company.trim() ? 'Company name is required' : undefined

  const submit = () => {
    setTouched(true)
    if (!draft.company.trim()) return
    const owner = BD_REPS.find((r) => r.id === draft.ownerId)
    saveLead({ ...draft, ownerName: owner?.name ?? draft.ownerName })
    toast(lead ? `${draft.company} updated` : `${draft.company} added to the pipeline`, 'success')
    onClose()
  }

  const toggleService = (service: string) =>
    setDraft((d) => ({
      ...d,
      services: d.services.includes(service)
        ? d.services.filter((s) => s !== service)
        : [...d.services, service],
    }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={lead ? `Edit ${lead.company}` : 'New lead'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit}>{lead ? 'Save changes' : 'Add lead'}</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Input
          label="Company"
          value={draft.company}
          onChange={(e) => set('company', e.target.value)}
          error={companyError}
          placeholder="Nordic Freight Systems"
          className="sm:col-span-2"
        />
        <Input
          label="Contact name"
          value={draft.contactName}
          onChange={(e) => set('contactName', e.target.value)}
          placeholder="Henrik Sølvberg"
        />
        <Input
          label="Job title"
          value={draft.contactTitle}
          onChange={(e) => set('contactTitle', e.target.value)}
          placeholder="Operations Director"
        />
        <Input
          label="Email"
          type="email"
          value={draft.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="henrik@nordicfreight.no"
        />
        <Input
          label="Phone"
          type="tel"
          value={draft.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="+47 22 45 10 88"
        />

        <FormField label="Source channel">
          <Select
            value={draft.channel}
            onChange={(v) => set('channel', v as BdChannel)}
            options={CHANNEL_ORDER.map((c) => ({ value: c, label: CHANNEL_CONFIG[c].label }))}
          />
        </FormField>
        <FormField label="Industry">
          <Select
            value={draft.industry}
            onChange={(v) => set('industry', v)}
            options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
          />
        </FormField>

        <div className="sm:col-span-2">
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Services interested in</p>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((service) => {
              const active = draft.services.includes(service)
              return (
                <button
                  key={service}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleService(service)}
                  className={cn(
                    'rounded-sm border px-2.5 py-1.5 font-ui text-[12px] transition-colors duration-150',
                    active
                      ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
                      : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-2',
                  )}
                >
                  {service}
                </button>
              )
            })}
          </div>
        </div>

        <Input
          label="Estimated value (PKR)"
          type="number"
          min={0}
          step={50_000}
          value={draft.value || ''}
          onChange={(e) => set('value', Number(e.target.value) || 0)}
          placeholder="1500000"
        />
        <FormField label="Assigned rep">
          <Select
            value={draft.ownerId}
            onChange={(v) => set('ownerId', v)}
            options={BD_REPS.map((r) => ({ value: r.id, label: r.name }))}
          />
        </FormField>

        <FormField label="Stage">
          <Select
            value={draft.stage}
            onChange={(v) => set('stage', v as LeadStage)}
            options={STAGE_ORDER.map((s) => ({ value: s, label: STAGE_CONFIG[s].label }))}
          />
        </FormField>
        <FormField label="Priority">
          <Select
            value={draft.temperature}
            onChange={(v) => set('temperature', v as LeadTemperature)}
            options={TEMPERATURES}
          />
        </FormField>

        <FormField label="ICP fit">
          <Select
            value={draft.icpFit}
            onChange={(v) => set('icpFit', v as IcpFit)}
            options={ICP_FITS}
          />
        </FormField>
        <div>
          <p className="mb-1.5 font-ui text-[12px] font-medium text-text-2">Next follow-up</p>
          <DatePicker
            value={draft.nextFollowUp ?? ''}
            onChange={(v) => set('nextFollowUp', v || null)}
            placeholder="Pick a date"
          />
        </div>
      </div>
    </Modal>
  )
}
