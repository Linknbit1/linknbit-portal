import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMyAttendance,
  fetchMyTodayAttendance,
  fetchAllAttendance,
  checkIn,
  checkOut,
  markAttendance,
  adminCheckOut,
  fetchAttendanceSettings,
  updateAttendanceSettings,
} from '../api/attendance'
import type { MarkAttendancePayload } from '../api/attendance'
import type { TablesUpdate } from '../types/database'

export const ATTENDANCE_KEYS = {
  myHistory: ['attendance', 'my'] as const,
  myToday: ['attendance', 'my', 'today'] as const,
  allByDate: (date: string) => ['attendance', 'all', date] as const,
  settings: ['attendance', 'settings'] as const,
}

export function useMyAttendanceHistory(days = 30) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myHistory,
    queryFn: () => fetchMyAttendance(days),
  })
}

export function useMyTodayAttendance() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myToday,
    queryFn: fetchMyTodayAttendance,
    staleTime: 1000 * 60, // re-check every minute
  })
}

export function useAllAttendance(date: string) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allByDate(date),
    queryFn: () => fetchAllAttendance(date),
  })
}

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: checkIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myToday })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myHistory })
    },
  })
}

export function useCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: checkOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myToday })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myHistory })
    },
  })
}

export function useMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MarkAttendancePayload) => markAttendance(payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.allByDate(variables.date) })
    },
  })
}

export function useAdminCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, date: _date }: { id: string; date: string }) => adminCheckOut(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.allByDate(data.date) })
    },
  })
}

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.settings,
    queryFn: fetchAttendanceSettings,
    staleTime: Infinity,
  })
}

export function useUpdateAttendanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesUpdate<'attendance_settings'>) =>
      updateAttendanceSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.settings }),
  })
}
