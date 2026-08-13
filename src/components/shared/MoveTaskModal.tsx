import { useMemo, useState } from 'react'
import { ArrowRight, CornerUpRight } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { useToast } from '../ui/toast-context'
import { useProjects } from '../../hooks/useProjects'
import { useProjectServices } from '../../hooks/useProjectServices'
import { useServiceStages } from '../../hooks/useStages'
import { useMoveTask } from '../../hooks/useTasks'

interface MoveTaskModalProps {
  taskId: string
  taskTitle: string
  /** Where it is now, for the "from" half of the summary. */
  currentProjectId: string
  currentProjectName: string
  currentServiceId: string
  currentServiceName?: string | null
  onClose: () => void
  /** Fires after a successful move — lets a board close the drawer it came from. */
  onMoved?: () => void
}

/**
 * Moves a task to another project, ClickUp-style: pick the destination, see
 * what travels with it, confirm.
 *
 * The service (not the project) is the real destination — a task hangs off a
 * project_service block — so the project picker only narrows which services are
 * on offer.
 */
export function MoveTaskModal({
  taskId, taskTitle, currentProjectId, currentProjectName, currentServiceId, currentServiceName,
  onClose, onMoved,
}: MoveTaskModalProps) {
  const toast = useToast()
  const move = useMoveTask()

  const { data: projects = [] } = useProjects()
  const [projectId, setProjectId] = useState(currentProjectId)
  const { data: services = [] } = useProjectServices(projectId || undefined)

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s.id, label: s.service?.name ?? 'Service', dot: s.service?.color ?? undefined })),
    [services],
  )
  // Switching project invalidates the chosen service; fall back to its first.
  const [serviceId, setServiceId] = useState(currentServiceId)
  const destinationService = serviceOptions.some((o) => o.value === serviceId)
    ? serviceId
    : serviceOptions[0]?.value ?? ''

  const { data: stages = [] } = useServiceStages(destinationService || undefined)
  const [stageId, setStageId] = useState('')
  const stageOptions = [{ value: '', label: 'No stage' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]
  const effectiveStage = stageOptions.some((o) => o.value === stageId) ? stageId : ''

  const projectName = projects.find((p) => p.id === projectId)?.name ?? currentProjectName
  const serviceName = serviceOptions.find((o) => o.value === destinationService)?.label
  const unchanged = destinationService === currentServiceId
  const noServices = projectId !== '' && serviceOptions.length === 0

  const submit = () => {
    if (!destinationService) { toast('Pick a service to move into', 'error'); return }
    move.mutate(
      { taskId, projectServiceId: destinationService, stageId: effectiveStage || null, fromProjectId: currentProjectId },
      {
        onSuccess: () => { toast(`Moved to ${projectName}`, 'success'); onMoved?.(); onClose() },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not move the task', 'error'),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Move task"
      size="sm"
      busy={move.isPending}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={move.isPending}>Cancel</Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={submit}
            loading={move.isPending}
            disabled={unchanged || noServices || !destinationService}
          >
            Move task
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="font-ui text-[13px] text-text-2">
          <span className="font-semibold text-text-1">{taskTitle}</span>
        </p>

        {/* From → To, so the move is legible before it happens. */}
        <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-inset px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9.5px] uppercase tracking-wider text-text-4">From</span>
            <span className="block truncate font-ui text-[12.5px] text-text-2">
              {currentProjectName}{currentServiceName ? ` · ${currentServiceName}` : ''}
            </span>
          </span>
          <ArrowRight size={14} className="shrink-0 text-text-4" />
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9.5px] uppercase tracking-wider text-text-4">To</span>
            <span className="block truncate font-ui text-[12.5px] text-text-1">
              {projectName}{serviceName ? ` · ${serviceName}` : ''}
            </span>
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Project</label>
          <Select
            value={projectId}
            onChange={(v) => { setProjectId(v); setServiceId(''); setStageId('') }}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select a project…"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Service</label>
          {noServices ? (
            <p className="rounded-md border border-dashed border-border-default px-3 py-2.5 font-ui text-[12px] text-text-4">
              That project has no services yet — a task has to live in one. Add a service to it first.
            </p>
          ) : (
            <Select value={destinationService} onChange={setServiceId} options={serviceOptions} placeholder="Select a service…" />
          )}
        </div>

        {stageOptions.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">Stage</label>
            <Select value={effectiveStage} onChange={setStageId} options={stageOptions} placeholder="No stage" />
          </div>
        )}

        {/* Says plainly what survives the move — the question everyone asks. */}
        <div className="flex gap-2 rounded-md border border-border-subtle bg-surface-2/40 px-3 py-2.5">
          <CornerUpRight size={13} className="mt-0.5 shrink-0 text-text-4" />
          <p className="font-ui text-[11.5px]/relaxed text-text-3">
            Comments, subtasks, attachments, logged time, watchers and assignees all move with the task.
            {' '}A stage from the old service is dropped, since stages belong to one service.
          </p>
        </div>
      </div>
    </Modal>
  )
}
