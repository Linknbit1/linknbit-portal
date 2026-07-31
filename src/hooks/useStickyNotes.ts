import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStickyNote,
  deleteStickyNote,
  fetchStickyNotes,
  updateStickyNote,
  type CreateStickyNoteInput,
  type StickyNote,
  type UpdateStickyNoteInput,
} from '../api/stickyNotes'
import { useAuthContext } from '../context/AuthContext'

export const STICKY_NOTE_KEYS = {
  all: ['sticky_notes'] as const,
}

export function useStickyNotes() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: STICKY_NOTE_KEYS.all,
    queryFn: fetchStickyNotes,
    enabled: !!accessToken,
  })
}

export function useCreateStickyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    // Tagged so useRealtimeStickyNotes can tell when this client has writes in
    // flight and hold off refreshing over the top of them.
    mutationKey: STICKY_NOTE_KEYS.all,
    mutationFn: (input: CreateStickyNoteInput) => createStickyNote(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STICKY_NOTE_KEYS.all }),
  })
}

/**
 * Dragging a note fires an update on every drop, so the cache is written
 * optimistically — waiting for a round trip would make the note snap back to
 * its old spot for a moment, which reads as a bug.
 */
export function useUpdateStickyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: STICKY_NOTE_KEYS.all,
    mutationFn: (input: UpdateStickyNoteInput) => updateStickyNote(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: STICKY_NOTE_KEYS.all })
      const previous = queryClient.getQueryData<StickyNote[]>(STICKY_NOTE_KEYS.all)
      queryClient.setQueryData<StickyNote[]>(STICKY_NOTE_KEYS.all, (old) =>
        old?.map((n) =>
          n.id === input.id
            ? {
                ...n,
                ...(input.content === undefined ? {} : { content: input.content }),
                ...(input.color === undefined ? {} : { color: input.color }),
                ...(input.shape === undefined ? {} : { shape: input.shape }),
                ...(input.posX === undefined ? {} : { pos_x: input.posX }),
                ...(input.posY === undefined ? {} : { pos_y: input.posY }),
                ...(input.zIndex === undefined ? {} : { z_index: input.zIndex }),
              }
            : n,
        ) ?? [],
      )
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(STICKY_NOTE_KEYS.all, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: STICKY_NOTE_KEYS.all }),
  })
}

export function useDeleteStickyNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: STICKY_NOTE_KEYS.all,
    mutationFn: (id: string) => deleteStickyNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STICKY_NOTE_KEYS.all }),
  })
}
