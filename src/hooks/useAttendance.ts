import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMyAttendance,
  fetchMyTodayAttendance,
  fetchAllAttendance,
  fetchMonthlyAttendance,
  checkIn,
  checkOut,
  markAttendance,
  adminCheckOut,
  fetchAttendanceSettings,
  updateAttendanceSettings,
  fetchAttendanceExceptions,
  fetchAllAttendanceExceptions,
  requestException,
  reviewException,
  oooDepart,
  oooReturn,
  fetchHolidays,
  createHoliday,
  createHolidayRange,
  deleteHoliday,
  fetchWorkingSaturdays,
  addWorkingSaturday,
  removeWorkingSaturday,
  fetchMyOvertimeRequests,
  fetchAllOvertimeRequests,
  fetchMonthlyOvertime,
  submitOvertimeRequest,
  reviewOvertimeRequest,
  submitWfhRequest,
  fetchMyWfhRequests,
  fetchAllWfhRequests,
  reviewWfhRequest,
  grantWfh,
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  submitLeaveRequest,
  fetchMyLeaveRequests,
  fetchAllLeaveRequests,
  reviewLeaveRequest,
  fetchMyLeaveBalances,
} from '../api/attendance'
import type {
  MarkAttendancePayload,
  RequestExceptionPayload,
  FetchExceptionsFilters,
  CreateHolidayPayload,
  SubmitOvertimePayload,
  LeaveTypePayload,
  SubmitLeavePayload,
} from '../api/attendance'
import type { TablesUpdate } from '../types/database'

export const ATTENDANCE_KEYS = {
  myHistory: ['attendance', 'my'] as const,
  myToday: ['attendance', 'my', 'today'] as const,
  allByDate: (date: string) => ['attendance', 'all', date] as const,
  monthly: (year: number, month: number) => ['attendance', 'monthly', year, month] as const,
  settings: ['attendance', 'settings'] as const,
  exceptions: (filters: FetchExceptionsFilters) => ['attendance', 'exceptions', filters] as const,
  myExceptions: ['attendance', 'exceptions', 'my'] as const,
  allExceptions: (filters: FetchExceptionsFilters) => ['attendance', 'exceptions', 'all', filters] as const,
  holidays: (year?: number) => ['attendance', 'holidays', year] as const,
  workingSaturdays: (year?: number) => ['attendance', 'working-saturdays', year] as const,
  myOvertime: ['attendance', 'overtime', 'my'] as const,
  allOvertime: (status?: string) => ['attendance', 'overtime', 'all', status] as const,
  monthlyOvertime: (year: number, month: number) => ['attendance', 'overtime', 'monthly', year, month] as const,
  myWfh: ['attendance', 'wfh', 'my'] as const,
  allWfh: (status?: string) => ['attendance', 'wfh', 'all', status] as const,
  leaveTypes: (activeOnly?: boolean) => ['attendance', 'leave-types', activeOnly] as const,
  myLeave: ['attendance', 'leave', 'my'] as const,
  allLeave: (status?: string) => ['attendance', 'leave', 'all', status] as const,
  myLeaveBalances: ['attendance', 'leave', 'balances', 'my'] as const,
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

export function useMonthlyAttendance(year: number, month: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.monthly(year, month),
    queryFn: () => fetchMonthlyAttendance(year, month),
    staleTime: 1000 * 60 * 5, // 5 min — month data doesn't change frequently
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
    mutationFn: ({ id }: { id: string; date: string }) => adminCheckOut(id),
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

// ── Exceptions ────────────────────────────────────────────────────────────────

export function useAttendanceExceptions(filters: FetchExceptionsFilters = {}) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.exceptions(filters),
    queryFn: () => fetchAttendanceExceptions(filters),
  })
}

export function useAllAttendanceExceptions(filters: FetchExceptionsFilters = {}) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allExceptions(filters),
    queryFn: () => fetchAllAttendanceExceptions(filters),
  })
}

export function useMyExceptions() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myExceptions,
    queryFn: () => fetchAttendanceExceptions({}),
  })
}

export function useRequestException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RequestExceptionPayload) => requestException(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'exceptions'] })
    },
  })
}

export function useReviewException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'approved' | 'rejected'; note?: string }) =>
      reviewException(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'exceptions'] })
    },
  })
}

export function useOooDepart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => oooDepart(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'exceptions'] })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myToday })
    },
  })
}

export function useOooReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => oooReturn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'exceptions'] })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myToday })
    },
  })
}

// ── Holidays ──────────────────────────────────────────────────────────────────

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.holidays(year),
    queryFn: () => fetchHolidays(year),
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, createdBy }: { payload: CreateHolidayPayload; createdBy: string }) =>
      createHoliday(payload, createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'holidays'] })
      // Monthly report data may now reflect holiday status
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
    },
  })
}

export function useCreateHolidayRange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      name,
      type,
      createdBy,
    }: {
      startDate: string
      endDate: string
      name: string
      type: CreateHolidayPayload['type']
      createdBy: string
    }) => createHolidayRange(startDate, endDate, name, type, createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'holidays'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
    },
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'holidays'] })
    },
  })
}

// ── Working Saturdays ─────────────────────────────────────────────────────────

export function useWorkingSaturdays(year?: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.workingSaturdays(year),
    queryFn: () => fetchWorkingSaturdays(year),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAddWorkingSaturday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, note, createdBy }: { date: string; note: string | null; createdBy: string }) =>
      addWorkingSaturday(date, note, createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'working-saturdays'] })
    },
  })
}

export function useRemoveWorkingSaturday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeWorkingSaturday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'working-saturdays'] })
    },
  })
}

// ── Overtime requests ─────────────────────────────────────────────────────────

export function useMyOvertimeRequests() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myOvertime,
    queryFn: fetchMyOvertimeRequests,
  })
}

export function useAllOvertimeRequests(status?: string) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allOvertime(status),
    queryFn: () => fetchAllOvertimeRequests(status),
  })
}

export function useMonthlyOvertime(year: number, month: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.monthlyOvertime(year, month),
    queryFn: () => fetchMonthlyOvertime(year, month),
    staleTime: 1000 * 60 * 5,
  })
}

export function useSubmitOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubmitOvertimePayload) => submitOvertimeRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myOvertime })
      qc.invalidateQueries({ queryKey: ['attendance', 'overtime', 'all'] })
    },
  })
}

export function useReviewOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      reviewedBy,
      reviewNote,
    }: {
      id: string
      status: 'approved' | 'rejected'
      reviewedBy: string
      reviewNote?: string
    }) => reviewOvertimeRequest(id, status, reviewedBy, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'overtime'] })
    },
  })
}

// ── WFH requests ──────────────────────────────────────────────────────────────

export function useMyWfhRequests() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myWfh,
    queryFn: fetchMyWfhRequests,
  })
}

export function useAllWfhRequests(status?: string) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allWfh(status),
    queryFn: () => fetchAllWfhRequests(status),
  })
}

export function useSubmitWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { date: string; reason: string }) => submitWfhRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'wfh'] })
    },
  })
}

export function useReviewWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reviewedBy, reviewNote }: {
      id: string; status: 'approved' | 'rejected'; reviewedBy: string; reviewNote?: string
    }) => reviewWfhRequest(id, status, reviewedBy, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'wfh'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
    },
  })
}

export function useGrantWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, date, reason, grantedBy }: {
      profileId: string; date: string; reason: string; grantedBy: string
    }) => grantWfh(profileId, date, reason, grantedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'wfh'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
    },
  })
}

// ── Leave types ───────────────────────────────────────────────────────────────

export function useLeaveTypes(activeOnly = false) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.leaveTypes(activeOnly),
    queryFn: () => fetchLeaveTypes(activeOnly),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateLeaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, createdBy }: { payload: LeaveTypePayload; createdBy: string }) =>
      createLeaveType(payload, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'leave-types'] }),
  })
}

export function useUpdateLeaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TablesUpdate<'leave_types'> }) =>
      updateLeaveType(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leave-types'] })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myLeaveBalances })
    },
  })
}

export function useDeleteLeaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLeaveType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'leave-types'] }),
  })
}

// ── Leave requests ────────────────────────────────────────────────────────────

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myLeave,
    queryFn: fetchMyLeaveRequests,
  })
}

export function useAllLeaveRequests(status?: string) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allLeave(status),
    queryFn: () => fetchAllLeaveRequests(status),
  })
}

export function useMyLeaveBalances() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myLeaveBalances,
    queryFn: fetchMyLeaveBalances,
    staleTime: 1000 * 60 * 5,
  })
}

export function useSubmitLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubmitLeavePayload) => submitLeaveRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leave'] })
    },
  })
}

export function useReviewLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reviewedBy, reviewNote }: {
      id: string; status: 'approved' | 'rejected'; reviewedBy: string; reviewNote?: string
    }) => reviewLeaveRequest(id, status, reviewedBy, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leave'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
    },
  })
}
