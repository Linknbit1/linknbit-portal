import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNavPins, createNavPin, deleteNavPin, type CreatePinPayload } from '../api/navPins'

export const NAV_PIN_KEYS = {
  all: ['nav_pins'] as const,
}

export function useNavPins() {
  return useQuery({
    queryKey: NAV_PIN_KEYS.all,
    queryFn: fetchNavPins,
    // The sidebar is always mounted; pins change only when this person changes
    // them, so there is nothing to poll for.
    staleTime: 5 * 60_000,
  })
}

export function useCreateNavPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePinPayload) => createNavPin(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: NAV_PIN_KEYS.all }),
  })
}

export function useDeleteNavPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNavPin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NAV_PIN_KEYS.all }),
  })
}
