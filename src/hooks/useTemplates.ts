import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTeamTemplates, fetchUsableTemplates, createTemplate, updateTemplate, deleteTemplate,
  createTemplateStage, updateTemplateStage, deleteTemplateStage,
  createTemplateTask, updateTemplateTask, deleteTemplateTask, applyTemplateToService,
} from '../api/templates'
import type { TablesInsert, TablesUpdate } from '../types/database'

export const TEMPLATE_KEYS = {
  all: ['templates'] as const,
  byTeam: (teamId: string) => ['templates', 'team', teamId] as const,
  usable: ['templates', 'usable'] as const,
}

export function useTeamTemplates(teamId: string | undefined) {
  return useQuery({
    queryKey: TEMPLATE_KEYS.byTeam(teamId ?? ''),
    queryFn: () => fetchTeamTemplates(teamId!),
    enabled: !!teamId,
    staleTime: 30_000,
  })
}

/** Everything the signed-in user may apply, for the project-creation picker. */
export function useUsableTemplates(enabled = true) {
  return useQuery({
    queryKey: TEMPLATE_KEYS.usable,
    queryFn: fetchUsableTemplates,
    enabled,
    staleTime: 60_000,
  })
}

/** Every mutation touches the same nested tree, so they all invalidate the prefix. */
function useTemplateInvalidation() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: TEMPLATE_KEYS.all })
}

export function useCreateTemplate() {
  const invalidate = useTemplateInvalidation()
  return useMutation({
    mutationFn: (payload: TablesInsert<'project_templates'>) => createTemplate(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTemplate() {
  const invalidate = useTemplateInvalidation()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'project_templates'> }) =>
      updateTemplate(id, updates),
    onSuccess: invalidate,
  })
}

export function useDeleteTemplate() {
  const invalidate = useTemplateInvalidation()
  return useMutation({ mutationFn: (id: string) => deleteTemplate(id), onSuccess: invalidate })
}

export function useCreateTemplateStage() {
  const invalidate = useTemplateInvalidation()
  return useMutation({
    mutationFn: (payload: TablesInsert<'template_stages'>) => createTemplateStage(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTemplateStage() {
  const invalidate = useTemplateInvalidation()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'template_stages'> }) =>
      updateTemplateStage(id, updates),
    onSuccess: invalidate,
  })
}

export function useDeleteTemplateStage() {
  const invalidate = useTemplateInvalidation()
  return useMutation({ mutationFn: (id: string) => deleteTemplateStage(id), onSuccess: invalidate })
}

export function useCreateTemplateTask() {
  const invalidate = useTemplateInvalidation()
  return useMutation({
    mutationFn: (payload: TablesInsert<'template_tasks'>) => createTemplateTask(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateTemplateTask() {
  const invalidate = useTemplateInvalidation()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'template_tasks'> }) =>
      updateTemplateTask(id, updates),
    onSuccess: invalidate,
  })
}

export function useDeleteTemplateTask() {
  const invalidate = useTemplateInvalidation()
  return useMutation({ mutationFn: (id: string) => deleteTemplateTask(id), onSuccess: invalidate })
}

/** Applying writes real stages and tasks, so the project caches must refresh too. */
export function useApplyTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectServiceId, templateId }: { projectServiceId: string; templateId: string }) =>
      applyTemplateToService(projectServiceId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stages'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
