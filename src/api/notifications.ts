import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type NotificationRow = Tables<'notifications'>
export type NotificationPreferenceRow = Tables<'notification_preferences'>
export type PushSubscriptionRow = Tables<'push_subscriptions'>

export async function fetchNotifications(profileId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

/** Clears a grouped row's whole run in one round trip. */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .in('id', ids)
  if (error) throw error
}

export async function markAllRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false)
  if (error) throw error
}

// ── Preferences (opt-out: a row exists only for types turned OFF) ─────────────

export async function fetchNotificationPreferences(profileId: string): Promise<NotificationPreferenceRow[]> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('profile_id', profileId)
  if (error) throw error
  return data
}

export async function setNotificationPreference(
  profileId: string,
  type: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { profile_id: profileId, type, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'profile_id,type' },
    )
  if (error) throw error
}

// ── Push subscriptions (one row per device) ───────────────────────────────────

// The VAPID public key is served by the send-push function rather than baked in
// at build time, so rotating keys needs no frontend redeploy. Cached per session.
let cachedVapidKey: string | null = null
export async function fetchVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey
  const { data, error } = await supabase.functions.invoke<{ publicKey: string }>('send-push', {
    method: 'GET',
  })
  if (error || !data?.publicKey) throw new Error('push_not_configured')
  cachedVapidKey = data.publicKey
  return cachedVapidKey
}

export async function fetchPushSubscriptions(profileId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export interface UpsertPushSubscriptionPayload {
  profileId: string
  endpoint: string
  p256dh: string
  auth: string
  deviceLabel: string
  deviceFingerprint: string | null
}

// Keyed on endpoint (globally unique per browser install). Re-subscribing on the
// same device updates the row rather than duplicating it, and a shared browser
// where a different person signs in reassigns the row to them.
export async function upsertPushSubscription(p: UpsertPushSubscriptionPayload): Promise<PushSubscriptionRow> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        profile_id: p.profileId,
        endpoint: p.endpoint,
        p256dh: p.p256dh,
        auth: p.auth,
        device_label: p.deviceLabel,
        device_fingerprint: p.deviceFingerprint,
        enabled: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Silence a device without unsubscribing it (e.g. muting your office desktop from your phone). */
export async function setPushSubscriptionEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ enabled })
    .eq('id', id)
  if (error) throw error
}

export async function deletePushSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('id', id)
  if (error) throw error
}
