import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchEnrolledDevices,
  fetchMyEnrolledDevices,
  approveDevice,
  deactivateDevice,
  registerDevice,
  type EnrolledDeviceWithProfile,
} from '../api/attendance'

export type { EnrolledDeviceWithProfile }

export const DEVICE_KEYS = {
  all: ['enrolled_devices'] as const,
  mine: ['enrolled_devices', 'mine'] as const,
}

export function useEnrolledDevices(enabled = true) {
  return useQuery({
    queryKey: DEVICE_KEYS.all,
    queryFn: fetchEnrolledDevices,
    enabled,
  })
}

export function useMyEnrolledDevices() {
  return useQuery({
    queryKey: DEVICE_KEYS.mine,
    queryFn: fetchMyEnrolledDevices,
  })
}

export function useRegisterDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { deviceFingerprint: string; deviceName: string; fingerprintHint?: string }) =>
      registerDevice(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DEVICE_KEYS.mine })
      qc.invalidateQueries({ queryKey: DEVICE_KEYS.all })
    },
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
