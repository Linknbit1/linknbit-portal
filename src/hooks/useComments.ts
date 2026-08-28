import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchComments, createComment, updateComment, deleteComment, fetchMyLatestCommentAt,
  type CreateCommentArgs, type UpdateCommentArgs,
} from '../api/comments'
import { TASK_KEYS } from './useTasks'

export const COMMENT_KEYS = {
  byTask: (taskId: string) => ['comments', taskId] as const,
  /** `taskIds` must be sorted, so the same set always hits the same cache entry. */
  mineByTasks: (profileId: string, taskIds: string[]) =>
    ['comments', 'mine', profileId, taskIds] as const,
}

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: COMMENT_KEYS.byTask(taskId ?? ''),
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
    staleTime: 10_000,
  })
}

/**
 * When this person last commented on each of the given tasks. Answers "have they
 * already replied?" for the mention rows in Waiting on you, in one round trip
 * rather than a thread fetch per mention.
 */
export function useMyLatestCommentAt(profileId: string, taskIds: string[]) {
  // Sorted here rather than at the call site: the caller derives its ids from a
  // list whose order it does not control, and an order change is not a new query.
  const sorted = useMemo(() => [...taskIds].sort(), [taskIds])

  return useQuery({
    queryKey: COMMENT_KEYS.mineByTasks(profileId, sorted),
    queryFn: () => fetchMyLatestCommentAt(profileId, sorted),
    enabled: !!profileId && sorted.length > 0,
    staleTime: 30_000,
  })
}

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, args }: { taskId: string; args: CreateCommentArgs }) => createComment(taskId, args),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(row.task_id) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}

export function useUpdateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: UpdateCommentArgs; taskId: string }) => updateComment(id, args),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(v.taskId) })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; taskId: string }) => deleteComment(id),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(v.taskId) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}
