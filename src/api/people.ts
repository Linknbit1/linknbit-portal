import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { ProfileRow } from './auth'

export type Person = ProfileRow
export type EmployeeSalary = Tables<'employee_salaries'>

export interface InvitePayload {
  name: string
  email: string
  role: string
  designation_id?: string | null
  job_type?: string
  team_ids?: string[]
}

export interface InviteResult {
  ok: boolean
  profile_id: string
  invite_link: string | null
  emailed: boolean
}

// Pull a friendly message out of a Supabase Functions error (the body is on the Response).
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    // `context` holds the raw Response for FunctionsHttpError; narrowing it cleanly
    // isn't possible without an assertion, hence the justified cast.
    const ctx = (error as { context: unknown }).context
    if (ctx instanceof Response) {
      try {
        const body = await ctx.json()
        if (body?.error) return body.error
      } catch { /* non-JSON body — fall through */ }
    }
  }
  return error instanceof Error ? error.message : fallback
}

export async function fetchPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .not('role', 'in', '("client_owner","client_member")')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function inviteUser(payload: InvitePayload): Promise<InviteResult> {
  const { data, error } = await supabase.functions.invoke<InviteResult>('invite-user', { body: payload })
  if (error) throw new Error(await functionErrorMessage(error, 'Invite failed'))
  if (!data) throw new Error('No response from invite-user')
  return data
}

export async function updatePersonRole(
  profileId: string,
  role: string,
  designationId: string | null,
  jobType: string,
  /** HH:MM to set the allowed check-in override, or '' to clear it (normal rule). */
  allowedCheckIn: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_profile_role', {
    p_profile_id: profileId,
    p_role: role,
    p_designation_id: designationId ?? undefined,
    p_job_type: jobType,
    p_allowed_check_in: allowedCheckIn,
  })
  if (error) throw error
}

export async function updatePersonDetails(
  profileId: string,
  name: string,
  avatarUrl: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_profile_details', {
    p_profile_id: profileId,
    p_name: name,
    p_avatar_url: avatarUrl ?? undefined,
  })
  if (error) throw error
}

export async function uploadPersonAvatar(profileId: string, file: File): Promise<string> {
  const body = new FormData()
  body.set('profile_id', profileId)
  body.set('avatar', file)

  const { data, error } = await supabase.functions.invoke<{ avatar_url: string }>('admin-upload-avatar', { body })
  if (error) throw new Error(await functionErrorMessage(error, 'Avatar upload failed'))
  if (!data?.avatar_url) throw new Error('Avatar upload failed')
  return data.avatar_url
}

export async function setPersonActive(profileId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_profile_active', {
    p_profile_id: profileId,
    p_active: active,
  })
  if (error) throw error
}

export async function deletePerson(profileId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-user', { body: { profile_id: profileId } })
  if (error) throw new Error(await functionErrorMessage(error, 'Delete user failed'))
}

export async function resendInvite(profileId: string): Promise<{ emailed: boolean; invite_link: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; emailed: boolean; invite_link: string | null }>(
    'resend-invite', { body: { profile_id: profileId } },
  )
  if (error) throw new Error(await functionErrorMessage(error, 'Resend invite failed'))
  if (!data) throw new Error('No response from resend-invite')
  return { emailed: data.emailed, invite_link: data.invite_link }
}

export async function setUserPassword(profileId: string, password: string): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-set-password', {
    body: { profile_id: profileId, password },
  })
  if (error) throw new Error(await functionErrorMessage(error, 'Password change failed'))
}

// ── Salary (RLS: owner + HR/admin only) ───────────────────────────────────────

// Returns null when the caller isn't allowed to see this salary (RLS filters the
// row out) or none has been set yet.
export async function fetchSalary(profileId: string): Promise<EmployeeSalary | null> {
  const { data, error } = await supabase
    .from('employee_salaries')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSalary(
  profileId: string,
  amount: number,
  currency: string,
): Promise<EmployeeSalary> {
  // updated_by / updated_at are stamped by the trg_salary_audit trigger.
  const { data, error } = await supabase
    .from('employee_salaries')
    .upsert({ profile_id: profileId, amount, currency }, { onConflict: 'profile_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
