import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAttachments, fetchProjectFiles, uploadAttachment, deleteAttachment, toggleAttachmentVisibility,
  addAttachmentLink, setAttachmentConfidential,
  type UploadAttachmentArgs, type AddLinkArgs,
} from '../api/attachments'
import { TASK_KEYS } from './useTasks'
import { PROJECT_KEYS } from './useProjects'

export const ATTACHMENT_KEYS = {
  byTask: (taskId: string) => ['attachments', 'task', taskId] as const,
  byProject: (projectId: string) => ['attachments', 'project', projectId] as const,
  allByProject: (projectId: string) => ['attachments', 'all', projectId] as const,
  byLead: (leadId: string) => ['attachments', 'lead', leadId] as const,
}

/** Documents attached to a BD lead — uploads and Drive links alike. */
export function useLeadAttachments(leadId: string | undefined) {
  return useQuery({
    queryKey: ATTACHMENT_KEYS.byLead(leadId ?? ''),
    queryFn: () => fetchAttachments({ leadId }),
    enabled: !!leadId,
    staleTime: 15_000,
  })
}

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ATTACHMENT_KEYS.allByProject(projectId ?? ''),
    queryFn: () => fetchProjectFiles(projectId!),
    enabled: !!projectId,
    staleTime: 15_000,
  })
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ATTACHMENT_KEYS.byTask(taskId ?? ''),
    queryFn: () => fetchAttachments({ taskId }),
    enabled: !!taskId,
    staleTime: 15_000,
  })
}

export function useProjectAttachments(projectId: string | undefined) {
  return useQuery({
    queryKey: ATTACHMENT_KEYS.byProject(projectId ?? ''),
    queryFn: () => fetchAttachments({ projectId }),
    enabled: !!projectId,
    staleTime: 15_000,
  })
}

/**
 * Refresh whichever lists could be showing this attachment.
 *
 * A row hangs off a project or a lead, never both, so the owner decides which
 * keys are worth touching — invalidating the project keys for a lead document
 * would refetch every project file list in the cache for nothing.
 */
function invalidateAttachment(
  qc: ReturnType<typeof useQueryClient>,
  owner: { projectId?: string | null; leadId?: string | null; taskId?: string | null },
) {
  if (owner.taskId) qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.byTask(owner.taskId) })
  if (owner.leadId) qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.byLead(owner.leadId) })
  if (owner.projectId) {
    qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.byProject(owner.projectId) })
    qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.allByProject(owner.projectId) })
    qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(owner.projectId) })
  }
}

/** The owner keys off a returned row, for the mutations that get one back. */
const ownerOf = (row: { project_id: string | null; lead_id: string | null; task_id: string | null }) =>
  ({ projectId: row.project_id, leadId: row.lead_id, taskId: row.task_id })

export function useUploadAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, args }: { file: File; args: UploadAttachmentArgs }) => uploadAttachment(file, args),
    onSuccess: (row) => invalidateAttachment(qc, ownerOf(row)),
  })
}

export function useToggleAttachmentVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, clientVisible }: { id: string; clientVisible: boolean; projectId: string; taskId?: string | null }) =>
      toggleAttachmentVisibility(id, clientVisible),
    onSuccess: (row) => invalidateAttachment(qc, ownerOf(row)),
  })
}

export function useAddAttachmentLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: AddLinkArgs) => addAttachmentLink(args),
    onSuccess: (row) => invalidateAttachment(qc, ownerOf(row)),
  })
}

export function useSetAttachmentConfidential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isConfidential }: { id: string; isConfidential: boolean }) =>
      setAttachmentConfidential(id, isConfidential),
    onSuccess: (row) => invalidateAttachment(qc, ownerOf(row)),
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    // The row is gone by the time this resolves, so the caller says who owned it.
    mutationFn: ({ id, storagePath }: {
      id: string
      storagePath: string | null
      projectId?: string | null
      leadId?: string | null
      taskId?: string | null
    }) => deleteAttachment(id, storagePath),
    onSuccess: (_, v) =>
      invalidateAttachment(qc, { projectId: v.projectId, leadId: v.leadId, taskId: v.taskId }),
  })
}
