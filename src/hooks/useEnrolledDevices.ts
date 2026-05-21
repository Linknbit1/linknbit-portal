import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchEnrolledDevices,
  approveDevice,
  deactivateDevice,
  type EnrolledDeviceWithProfile,
} from '../api/attendance'

export type { EnrolledDeviceWithProfile }

export const DEVICE_KEYS = {
  all: ['enrolled_devices'] as const,
}

export function useEnrolledDevices() {
  return useQuery({
    queryKey: DEVICE_KEYS.all,
    queryFn: fetchEnrolledDevices,
  })
}

export function useApproveDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, approvedBy }: { deviceId: string; approvedBy: string }) =>
      approveDevice(deviceId, approvedBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICE_KEYS.all }),
  })
}

export function useDeactivateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => deactivateDevice(deviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: DEVICE_KEYS.all }),
  })
}
