import { supabase } from '../lib/supabase'
import type { ProfileRow } from './auth'

export type Person = ProfileRow

export interface InvitePayload {
  name: string
  email: string
  role: string
  team_id?: string | null
  service_type?: string | null
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
  teamId: string | null,
  serviceType: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_profile_role', {
    p_profile_id: profileId,
    p_role: role,
    p_team_id: teamId ?? undefined,
    p_service_type: serviceType ?? undefined,
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

export async function setPersonActive(profileId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_profile_active', {
    p_profile_id: profileId,
    p_active: active,
  })
  if (error) throw error
}
