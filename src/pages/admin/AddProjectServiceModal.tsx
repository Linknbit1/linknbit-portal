import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast-context'
import { useAddProjectService } from '../../hooks/useProjectServices'
import { useUsableTemplates, useApplyTemplate } from '../../hooks/useTemplates'

interface AddProjectServiceModalProps {
  projectId: string
  /** Services from the catalog this project is not already running. */
  options: { id: string; name: string; color: string }[]
  /** Receives the new project_service id so the page can switch to it. */
  onAdded: (projectServiceId: string) => void
  onClose: () => void
}

/**
 * Adds a service to an existing project, optionally pre-filled from one of the
 * team's templates — the same choice project creation offers, so a service added
 * later doesn't start emptier than one picked up front.
 */
export function AddProjectServiceModal({ projectId, options, onAdded, onClose }: AddProjectServiceModalProps) {
  const toast = useToast()
  const addService = useAddProjectService()
  const applyTemplate = useApplyTemplate()
  const { data: templates = [] } = useUsableTemplates()

  const [serviceId, setServiceId] = useState(options[0]?.id ?? '')
  const [templateId, setTemplateId] = useState('')

  const forService = templates.filter((t) => t.service_id === serviceId)
  const serviceName = options.find((o) => o.id === serviceId)?.name ?? 'service'
  const pending = addService.isPending || applyTemplate.isPending

  const submit = async () => {
    if (!serviceId) { toast('Choose a service', 'error'); return }
    try {
      const created = await addService.mutateAsync({ projectId, serviceId })
      if (templateId) {
        // A template failure must not read as "the service wasn't added" — it was.
        try {
          const r = await applyTemplate.mutateAsync({ projectServiceId: created.id, templateId })
          toast(`${serviceName} added, ${r.stages_created} stage(s), ${r.tasks_created} task(s)`, 'success')
        } catch (e) {
          toast(`${serviceName} added, but the template could not be applied: ${e instanceof Error ? e.message : 'failed'}`, 'error')
        }
      } else {
        toast(`${serviceName} added`, 'success')
      }
      onAdded(created.id)
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add the service', 'error')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a service"
      size="sm"
      busy={pending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" className="flex-1" iconLeft={<Plus size={13} />} onClick={submit} loading={pending}>
            Add service
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Service</label>
          <Select
            value={serviceId}
            onChange={(v) => { setServiceId(v); setTemplateId('') }}
            options={options.map((o) => ({ value: o.id, label: o.name, dot: o.color }))}
            placeholder="Select service…"
          />
          <p className="font-mono text-[10.5px] text-text-4">
            It gets its own stages, tasks and people.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Starting point</label>
          {forService.length > 0 ? (
            <>
              <Select
                value={templateId}
                onChange={setTemplateId}
                options={[
                  { value: '', label: 'Empty, no stages' },
                  ...forService.map((t) => ({
                    value: t.id,
                    label: `${t.name} · ${t.stages.length} stage${t.stages.length === 1 ? '' : 's'}`,
                  })),
                ]}
                placeholder="Empty, no stages"
              />
              <p className="font-mono text-[10.5px] text-text-4">
                A template copies its stages and tasks in. You can still change them afterwards.
              </p>
            </>
          ) : (
            // Say why the picker is absent — silence here read as a missing feature.
            <p className="rounded-md border border-border-default bg-surface-2/40 px-3 py-2 font-ui text-[12px] text-text-4">
              {serviceId
                ? `No templates exist for ${serviceName} yet. It will start empty, build a template on the owning team's page to reuse a pipeline next time.`
                : 'Pick a service first.'}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
