import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAttachments, fetchProjectFiles, uploadAttachment, deleteAttachment, toggleAttachmentVisibility,
  type UploadAttachmentArgs,
} from '../api/attachments'
import { TASK_KEYS } from './useTasks'
import { PROJECT_KEYS } from './useProjects'

export const ATTACHMENT_KEYS = {
  byTask: (taskId: string) => ['attachments', 'task', taskId] as const,
  byProject: (projectId: string) => ['attachments', 'project', projectId] as const,
  allByProject: (projectId: string) => ['attachments', 'all', projectId] as const,
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

function invalidateAttachment(qc: ReturnType<typeof useQueryClient>, projectId: string, taskId?: string | null) {
  if (taskId) qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.byTask(taskId) })
  qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.byProject(projectId) })
  qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.allByProject(projectId) })
  qc.invalidateQueries({ queryKey: TASK_KEYS.all })
  qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) })
}

export function useUploadAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, args }: { file: File; args: UploadAttachmentArgs }) => uploadAttachment(file, args),
    onSuccess: (row) => invalidateAttachment(qc, row.project_id, row.task_id),
  })
}

export function useToggleAttachmentVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, clientVisible }: { id: string; clientVisible: boolean; projectId: string; taskId?: string | null }) =>
      toggleAttachmentVisibility(id, clientVisible),
    onSuccess: (row) => invalidateAttachment(qc, row.project_id, row.task_id),
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string; projectId: string; taskId?: string | null }) =>
      deleteAttachment(id, storagePath),
    onSuccess: (_, v) => invalidateAttachment(qc, v.projectId, v.taskId),
  })
}
