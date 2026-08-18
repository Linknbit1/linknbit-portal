import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMyAttendance,
  fetchMyMonthlyAttendance,
  fetchMyTodayAttendance,
  fetchAllAttendance,
  fetchMonthlyAttendance,
  checkIn,
  markAttendance,
  updateAttendanceRecord,
  fetchAttendanceSettings,
  updateAttendanceSettings,
  fetchAttendanceExceptions,
  fetchAllAttendanceExceptions,
  requestException,
  updateException,
  reviewException,
  deleteException,
  oooDepart,
  oooReturn,
  fetchHolidays,
  createHoliday,
  createHolidayRange,
  deleteHoliday,
  fetchWorkingSaturdays,
  addWorkingSaturday,
  removeWorkingSaturday,
  fetchCompanyWfhDays,
  addCompanyWfhDay,
  removeCompanyWfhDay,
  fetchMyOvertimeRequests,
  fetchAllOvertimeRequests,
  fetchMonthlyOvertime,
  submitOvertimeRequest,
  updateOvertimeRequest,
  reviewOvertimeRequest,
  deleteOvertimeRequest,
  submitWfhRequest,
  updateWfhRequest,
  fetchMyWfhRequests,
  fetchAllWfhRequests,
  reviewWfhRequest,
  deleteWfhRequest,
  grantWfh,
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  submitLeaveRequest,
  enterLeaveForEmployee,
  updateLeaveRequest,
  fetchMyLeaveRequests,
  fetchAllLeaveRequests,
  fetchLeaveByProfile,
  fetchWfhByProfile,
  fetchAttendanceByProfileMonth,
  fetchLeaveBalancesByProfile,
  fetchOvertimeByProfile,
  reviewLeaveRequest,
  deleteLeaveRequest,
  fetchMyLeaveBalances,
} from '../api/attendance'
import type {
  MarkAttendancePayload,
  EditAttendancePayload,
  RequestExceptionPayload,
  FetchExceptionsFilters,
  CreateHolidayPayload,
  SubmitOvertimePayload,
  LeaveTypePayload,
  SubmitLeavePayload,
  EnterLeavePayload,
  SubmitWfhPayload,
  GrantWfhPayload,
} from '../api/attendance'
import type { TablesUpdate } from '../types/database'

export const ATTENDANCE_KEYS = {
  myHistory: ['attendance', 'my'] as const,
  myMonthly: (year: number, month: number) => ['attendance', 'my', 'monthly', year, month] as const,
  myToday: ['attendance', 'my', 'today'] as const,
  allByDate: (date: string) => ['attendance', 'all', date] as const,
  monthly: (year: number, month: number) => ['attendance', 'monthly', year, month] as const,
  settings: ['attendance', 'settings'] as const,
  exceptions: (filters: FetchExceptionsFilters) => ['attendance', 'exceptions', filters] as const,
  myExceptions: ['attendance', 'exceptions', 'my'] as const,
  allExceptions: (filters: FetchExceptionsFilters) => ['attendance', 'exceptions', 'all', filters] as const,
  holidays: (year?: number) => ['attendance', 'holidays', year] as const,
  workingSaturdays: (year?: number) => ['attendance', 'working-saturdays', year] as const,
  companyWfhDays: (year?: number) => ['attendance', 'company-wfh-days', year] as const,
  myOvertime: ['attendance', 'overtime', 'my'] as const,
  allOvertime: (status?: string) => ['attendance', 'overtime', 'all', status] as const,
  monthlyOvertime: (year: number, month: number) => ['attendance', 'overtime', 'monthly', year, month] as const,
  myWfh: ['attendance', 'wfh', 'my'] as const,
  allWfh: (status?: string) => ['attendance', 'wfh', 'all', status] as const,
  leaveTypes: (activeOnly?: boolean) => ['attendance', 'leave-types', activeOnly] as const,
  myLeave: ['attendance', 'leave', 'my'] as const,
  allLeave: (status?: string) => ['attendance', 'leave', 'all', status] as const,
  leaveByProfile: (id: string) => ['attendance', 'leave', 'by-profile', id] as const,
  wfhByProfile: (id: string) => ['attendance', 'wfh', 'by-profile', id] as const,
  attendanceByProfileMonth: (id: string, year: number, month: number) =>
    ['attendance', 'by-profile-month', id, year, month] as const,
  leaveBalancesByProfile: (id: string) => ['attendance', 'leave', 'balances', 'by-profile', id] as const,
  exceptionsByProfile: (id: string) => ['attendance', 'exceptions', 'by-profile', id] as const,
  overtimeByProfile: (id: string) => ['attendance', 'overtime', 'by-profile', id] as const,
  myLeaveBalances: ['attendance', 'leave', 'balances', 'my'] as const,
}

export function useMyAttendanceHistory(days = 30) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myHistory,
    queryFn: () => fetchMyAttendance(days),
  })
}

export function useMyMonthlyAttendance(year: number, month: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myMonthly(year, month),
    queryFn: () => fetchMyMonthlyAttendance(year, month),
    staleTime: 1000 * 60 * 5, // 5 min — historical months rarely change
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

export function useMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MarkAttendancePayload) => markAttendance(payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.allByDate(variables.date) })
    },
  })
}

export function useUpdateAttendanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EditAttendancePayload) => updateAttendanceRecord(payload),
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

export function useAllAttendanceExceptions(filters: FetchExceptionsFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allExceptions(filters),
    queryFn: () => fetchAllAttendanceExceptions(filters),
    enabled,
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

export function useUpdateException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RequestExceptionPayload }) =>
      updateException(id, payload),
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

// Admin-only delete. Excluded-minutes from a recorded OOO are not auto-reversed.
export function useDeleteException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteException(id),
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

// ── Company WFH days ──────────────────────────────────────────────────────────

export function useCompanyWfhDays(year?: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.companyWfhDays(year),
    queryFn: () => fetchCompanyWfhDays(year),
    staleTime: 1000 * 60 * 10,
  })
}

// Declaring/removing a company WFH day rewrites attendance rows for that date
// via DB triggers, so every attendance view has to be refetched.
function invalidateAfterCompanyWfhChange(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['attendance', 'company-wfh-days'] })
  qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
  qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
  qc.invalidateQueries({ queryKey: ['attendance', 'my'] })
}

export function useAddCompanyWfhDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, reason, createdBy }: { date: string; reason: string; createdBy: string }) =>
      addCompanyWfhDay(date, reason, createdBy),
    onSuccess: () => invalidateAfterCompanyWfhChange(qc),
  })
}

export function useRemoveCompanyWfhDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeCompanyWfhDay(id),
    onSuccess: () => invalidateAfterCompanyWfhChange(qc),
  })
}

// ── Overtime requests ─────────────────────────────────────────────────────────

export function useMyOvertimeRequests() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.myOvertime,
    queryFn: fetchMyOvertimeRequests,
  })
}

export function useAllOvertimeRequests(status?: string, enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allOvertime(status),
    queryFn: () => fetchAllOvertimeRequests(status),
    enabled,
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

export function useUpdateOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitOvertimePayload }) =>
      updateOvertimeRequest(id, payload),
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

// Admin-only delete. Overtime aggregates at read time, so removal is clean.
export function useDeleteOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOvertimeRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'overtime'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
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

export function useAllWfhRequests(status?: string, enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allWfh(status),
    queryFn: () => fetchAllWfhRequests(status),
    enabled,
  })
}

export function useSubmitWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubmitWfhPayload) => submitWfhRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'wfh'] })
    },
  })
}

export function useUpdateWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitWfhPayload }) =>
      updateWfhRequest(id, payload),
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

// Admin-only delete. Deleting an approved WFH also removes its synced attendance row
// (trg_wfh_sync now fires on DELETE), so invalidate attendance views too.
export function useDeleteWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWfhRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'wfh'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
    },
  })
}

export function useGrantWfh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, grantedBy }: { payload: GrantWfhPayload; grantedBy: string }) =>
      grantWfh(payload, grantedBy),
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

export function useAllLeaveRequests(status?: string, enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.allLeave(status),
    queryFn: () => fetchAllLeaveRequests(status),
    enabled,
  })
}

// Member profile page: leave & WFH for one person (RLS gates who actually gets rows).
export function useLeaveByProfile(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.leaveByProfile(id ?? ''),
    queryFn: () => fetchLeaveByProfile(id ?? ''),
    enabled: !!id,
  })
}

export function useWfhByProfile(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.wfhByProfile(id ?? ''),
    queryFn: () => fetchWfhByProfile(id ?? ''),
    enabled: !!id,
  })
}

export function useAttendanceByProfileMonth(id: string | undefined, year: number, month: number) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.attendanceByProfileMonth(id ?? '', year, month),
    queryFn: () => fetchAttendanceByProfileMonth(id ?? '', year, month),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useLeaveBalancesByProfile(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.leaveBalancesByProfile(id ?? ''),
    queryFn: () => fetchLeaveBalancesByProfile(id ?? ''),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useExceptionsByProfile(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.exceptionsByProfile(id ?? ''),
    queryFn: () => fetchAttendanceExceptions({ profileId: id }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useOvertimeByProfile(id: string | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.overtimeByProfile(id ?? ''),
    queryFn: () => fetchOvertimeByProfile(id ?? ''),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
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

// HR/admin enters leave on an employee's behalf. HR → pending; admin → applied directly
// (writes attendance rows), so invalidate the attendance views too.
export function useEnterLeaveForEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EnterLeavePayload) => enterLeaveForEmployee(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leave'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
    },
  })
}

export function useUpdateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitLeavePayload }) =>
      updateLeaveRequest(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leave'] })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myLeaveBalances })
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

// Admin-only delete. Deleting an approved leave also removes its synced attendance rows
// (trg_leave_sync now fires on DELETE), so invalidate attendance views too.
export function useDeleteLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLeaveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'leave'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'all'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.myLeaveBalances })
    },
  })
}
