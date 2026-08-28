import { useMemo, useState } from 'react'
import { ArrowRight, Building2, Wallet, Trophy, Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { MultiSelectPeople } from '../../components/ui/MultiSelectPeople'
import { useToast } from '../../components/ui/toast-context'
import { useClients } from '../../hooks/useClients'
import { usePeople } from '../../hooks/usePeople'
import { useServices } from '../../hooks/useServices'
import { useUsableTemplates } from '../../hooks/useTemplates'
import { FormField } from './FormField'
import { useBd } from '../../context/BdContext'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import type { Lead, HandoffServicePlan } from '../../types'

/**
 * BD sells eight fine-grained services; delivery runs a handful. This is where
 * the two vocabularies meet — a guess the rep can correct rather than a mapping
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
 * becomes a *real* project — client, services, pipelines and the people on them
 * — without anybody retyping the client, the value or the scope. Opens
 * automatically the moment a lead is moved to Won.
 *
 * Every service the deal was sold against gets its own block here, because that
 * is how delivery is actually structured: a project runs several services side
 * by side, each with its own stages, tasks and staff. Handing off one service
 * and leaving the rest to be remembered later is what used to go wrong.
 */
export function HandoffModal({ open, lead, onClose }: HandoffModalProps) {
  const toast = useToast()
  const { handOffLead } = useBd()
  const { data: services = [] } = useServices()
  const { data: people = [] } = usePeople()
  const { data: clients = [] } = useClients()
  const { data: templates = [] } = useUsableTemplates(open)

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services])

  // Everything BD sold, mapped down and de-duplicated — not just the first one.
  const guessedIds = useMemo(() => {
    if (!lead) return []
    const slugs = new Set(lead.services.map((s) => SERVICE_GUESS[s]).filter(Boolean))
    return activeServices.filter((s) => slugs.has(s.slug)).map((s) => s.id)
  }, [lead, activeServices])

  /**
   * Null until the rep touches the chips, so the guess can still land once the
   * services query resolves — it needs service *ids*, which are not known at
   * mount. After the first click this holds their choice and the guess is done.
   * Both call sites key this modal by lead id, so there is no stale-lead case.
   */
  const [picked, setPicked] = useState<string[] | null>(null)
  /**
   * Which client the project goes to. Starts on 'new' with the lead's company as
   * a *prefill only* — leads routinely carry a deal name rather than a company
   * ("Starr luxury jets - Project"), so this is the one field the rep is asked to
   * look at rather than accept.
   */
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new')
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState(lead?.company.trim() ?? '')
  const [templateByService, setTemplateByService] = useState<Record<string, string>>({})
  const [staffByService, setStaffByService] = useState<Record<string, string[]>>({})
  const [projectName, setProjectName] = useState(
    lead ? `${lead.company}, ${lead.services[0] ?? 'Project'}` : '',
  )
  const [budget, setBudget] = useState(lead?.value ?? 0)
  const [managerId, setManagerId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState(false)
  const [pending, setPending] = useState(false)

  if (!lead) return null

  const serviceIds = picked ?? guessedIds

  // Only staff who actually run projects should appear as the receiving PM.
  const managers = people.filter(
    (p) => p.is_active && ['project_manager', 'admin', 'super_admin', 'team_lead'].includes(p.role),
  )
  const staffOptions = people
    .filter((p) => p.is_active)
    .map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))

  const nameError = touched && !projectName.trim() ? 'Give the project a name' : undefined
  const managerError = touched && !managerId ? 'Somebody has to own the delivery' : undefined
  const serviceError = touched && serviceIds.length === 0 ? 'Pick at least one service' : undefined
  const clientError =
    touched && clientMode === 'existing' && !clientId ? 'Choose the client'
    : touched && clientMode === 'new' && !clientName.trim() ? 'Name the client'
    : undefined
  // A typed name that already exists attaches to it rather than making a twin —
  // say so before they confirm, not after two clients appear in the list.
  const nameMatch = clientMode === 'new'
    ? clients.find((c) => c.name.trim().toLowerCase() === clientName.trim().toLowerCase())
    : undefined

  const toggleService = (id: string) =>
    setPicked(serviceIds.includes(id) ? serviceIds.filter((s) => s !== id) : [...serviceIds, id])

  const submit = async () => {
    setTouched(true)
    if (!projectName.trim() || !managerId || serviceIds.length === 0) return
    if (clientMode === 'existing' ? !clientId : !clientName.trim()) return

    const plan: HandoffServicePlan[] = serviceIds.map((serviceId) => ({
      serviceId,
      templateId: templateByService[serviceId] || undefined,
      memberIds: staffByService[serviceId] ?? [],
    }))

    setPending(true)
    try {
      const outcome = await handOffLead({
        leadId: lead.id,
        projectName: projectName.trim(),
        managerId,
        budget,
        services: plan,
        clientId: clientMode === 'existing' ? clientId : undefined,
        clientName: clientMode === 'new' ? clientName.trim() : undefined,
        notes: notes.trim() || undefined,
        startDate: startDate || undefined,
        deadline: deadline || undefined,
      })
      const built = outcome.stagesCreated
        ? ` with ${outcome.stagesCreated} stage${outcome.stagesCreated === 1 ? '' : 's'} and ${outcome.tasksCreated} task${outcome.tasksCreated === 1 ? '' : 's'}`
        : ''
      toast(`${projectName.trim()} created in Delivery${built}`, 'success')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The handoff failed. Nothing was created.', 'error')
    } finally {
      setPending(false)
    }
  }

  const staffedCount = serviceIds.reduce((n, id) => n + (staffByService[id]?.length ?? 0), 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      busy={pending}
      title={
        <span className="flex items-center gap-2">
          <Trophy size={15} className="text-success" /> Hand off {lead.company}
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-ui text-[12px] text-text-4">
            {serviceIds.length || 0} service{serviceIds.length === 1 ? '' : 's'} · {staffedCount} person
            {staffedCount === 1 ? '' : 's'} staffed
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>Not yet</Button>
            <Button size="sm" iconLeft={<ArrowRight size={15} />} onClick={submit} loading={pending}>
              Hand off &amp; create project
            </Button>
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

        {/* The client, chosen rather than guessed. */}
        <div className="space-y-2 rounded-md border border-border-subtle bg-surface-2 p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="mr-auto text-label font-ui font-semibold uppercase tracking-wider text-text-2">
              Client
            </label>
            {(['existing', 'new'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={clientMode === mode}
                onClick={() => setClientMode(mode)}
                className={cn(
                  'rounded-sm border px-2.5 py-1 font-ui text-[12px] transition-colors',
                  clientMode === mode
                    ? 'border-border-strong bg-surface-3 text-text-1'
                    : 'border-border-default bg-surface-1 text-text-3 hover:text-text-1',
                )}
              >
                {mode === 'existing' ? 'Existing client' : 'New client'}
              </button>
            ))}
          </div>

          {clientMode === 'existing' ? (
            <Select
              value={clientId}
              onChange={setClientId}
              placeholder="Choose the client this work is for"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          ) : (
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Company or account name"
            />
          )}

          {clientError && <p className="font-ui text-[11.5px] text-error">{clientError}</p>}
          {nameMatch ? (
            <p className="font-ui text-[11.5px] text-warning">
              “{nameMatch.name}” already exists. This will attach to it rather than create a second one.
            </p>
          ) : (
            <p className="font-mono text-[10.5px] text-text-4">
              Prefilled from the lead ({lead.company}), check it. A lead often carries the deal name,
              not the client’s.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            error={nameError}
            className="sm:col-span-2"
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

          <Input
            label="Budget (PKR)"
            type="number"
            min={0}
            step={50_000}
            value={budget || ''}
            onChange={(e) => setBudget(Number(e.target.value) || 0)}
            helper="Carried from the deal value, edit if the signed figure differs"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start date">
              <DatePicker value={startDate} onChange={setStartDate} />
            </FormField>
            <FormField label="Deadline">
              <DatePicker value={deadline} onChange={setDeadline} minDate={startDate || undefined} />
            </FormField>
          </div>
        </div>

        {/* One block per service: the pipeline it starts from, and who is on it. */}
        <div className="space-y-2">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">
            Services to deliver
          </label>
          <div className="flex flex-wrap gap-1.5">
            {activeServices.map((s) => {
              const picked = serviceIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 font-ui text-[12px] transition-colors',
                    picked
                      ? 'border-border-strong bg-surface-3 text-text-1'
                      : 'border-border-default bg-surface-2 text-text-3 hover:text-text-1',
                  )}
                >
                  <span className="size-2 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.name}
                  {picked && <Check size={11} />}
                </button>
              )
            })}
          </div>
          <p className="font-mono text-[10.5px] text-text-4">BD sold: {lead.services.join(', ') || '-'}</p>
          {serviceError && <p className="font-ui text-[11.5px] text-error">{serviceError}</p>}

          {serviceIds.map((serviceId) => {
            const service = activeServices.find((s) => s.id === serviceId)
            const forService = templates.filter((t) => t.service_id === serviceId)
            return (
              <div
                key={serviceId}
                className="space-y-3 rounded-md border border-border-subtle bg-surface-2 p-3.5"
              >
                <p className="flex items-center gap-2 font-ui text-[12.5px] font-medium text-text-1">
                  <span className="size-2 rounded-full shrink-0" style={{ background: service?.color }} />
                  {service?.name}
                </p>

                {forService.length > 0 && (
                  <FormField label="Starting pipeline">
                    <Select
                      value={templateByService[serviceId] ?? ''}
                      onChange={(v) => setTemplateByService((prev) => ({ ...prev, [serviceId]: v }))}
                      options={[
                        { value: '', label: 'Empty, no stages' },
                        ...forService.map((t) => ({
                          value: t.id,
                          label: `${t.name} · ${t.stages.length} stage${t.stages.length === 1 ? '' : 's'}`,
                        })),
                      ]}
                      placeholder="Empty, no stages"
                    />
                  </FormField>
                )}

                <FormField label="Who is working on it">
                  <MultiSelectPeople
                    value={staffByService[serviceId] ?? []}
                    onChange={(ids) => setStaffByService((prev) => ({ ...prev, [serviceId]: ids }))}
                    options={staffOptions}
                    placeholder="Nobody yet. The PM can staff this later"
                  />
                </FormField>
              </div>
            )
          })}
        </div>

        <div>
          <label htmlFor="handoff-notes" className="mb-1.5 block font-ui text-[12px] font-medium text-text-2">
            Notes for delivery <span className="text-text-4">- optional</span>
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

        {/* States exactly what confirming does — it now really does it. */}
        <p className="rounded-md border border-border-subtle bg-surface-2 px-3 py-2 font-ui text-[11.5px] text-text-4">
          Creates the project in Delivery against the client above, with the services, pipelines and
          people you chose, then links this lead to it. The notes become the project description.
        </p>
      </div>
    </Modal>
  )
}
