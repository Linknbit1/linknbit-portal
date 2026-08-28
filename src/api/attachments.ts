import { supabase } from '../lib/supabase'
import { inferContentType } from '../lib/attachment'
import type { Tables } from '../types/database'
import { randomUUID } from '../lib/uuid'

export type AttachmentRow = Tables<'attachments'>

export interface AttachmentWithUploader extends AttachmentRow {
  uploader: { id: string; name: string; avatar_url: string | null } | null
}

export interface ProjectFile extends AttachmentRow {
  uploader: { id: string; name: string; avatar_url: string | null } | null
  task: { id: string; title: string } | null
}

/**
 * All files under a project — both project-level (task_id null) and task-level —
 * joined with the owning task so the UI can show a "Project" vs "Task: <title>"
 * differentiator. (Unlike fetchAttachments({projectId}), this does NOT exclude
 * task files.)
 */
export async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*, uploader:profiles!attachments_uploader_id_fkey(id,name,avatar_url), task:tasks(id,title)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export interface UploadAttachmentArgs {
  /** Exactly one of `projectId` / `leadId` / `bdTaskId` — the CHECK on the table enforces it. */
  projectId?: string
  leadId?: string
  bdTaskId?: string
  taskId?: string | null
  clientVisible?: boolean
  /** What the file is for, in the uploader's words. */
  description?: string | null
}

const BUCKET = 'attachments'

export async function fetchAttachments(
  args: { taskId?: string; projectId?: string; leadId?: string; bdTaskId?: string },
): Promise<AttachmentWithUploader[]> {
  let query = supabase
    .from('attachments')
    .select('*, uploader:profiles!attachments_uploader_id_fkey(id,name,avatar_url)')
    .order('created_at', { ascending: false })

  if (args.taskId) query = query.eq('task_id', args.taskId)
  // A lead's documents. No task dimension here — a lead has no sub-records.
  else if (args.leadId) query = query.eq('lead_id', args.leadId)
  // A BD task's documents. `task_id` points at the delivery `tasks` table, so a
  // BD task needs its own column rather than reusing it.
  else if (args.bdTaskId) query = query.eq('bd_task_id', args.bdTaskId)
  // Project-level files only (no task) when listing a project's files tab.
  else if (args.projectId) query = query.eq('project_id', args.projectId).is('task_id', null)

  const { data, error } = await query
  if (error) throw error
  return data
}

/** Upload a file to the private bucket, then record its metadata row. */
export async function uploadAttachment(file: File, args: UploadAttachmentArgs): Promise<AttachmentRow> {
  const { data: auth } = await supabase.auth.getUser()
  const uploaderId = auth.user?.id ?? null
  // Lead files live under their own prefix, so a bucket listing still reads as
  // "whose is this" without joining back to the table.
  const path = args.leadId
    ? `leads/${args.leadId}/${randomUUID()}-${file.name}`
    : args.bdTaskId
      ? `bd-tasks/${args.bdTaskId}/${randomUUID()}-${file.name}`
      : `${args.projectId}/${args.taskId ?? 'project'}/${randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || inferContentType(file.name) })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      project_id: args.projectId ?? null,
      lead_id: args.leadId ?? null,
      bd_task_id: args.bdTaskId ?? null,
      task_id: args.taskId ?? null,
      uploader_id: uploaderId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: path,
      client_visible: args.clientVisible ?? false,
      description: args.description?.trim() || null,
    })
    .select()
    .single()
  if (error) {
    // Roll back the orphaned storage object if the row insert failed.
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

/** Short-lived signed URL for downloading/previewing a private file. */
// Resolve a single attachment (for file-tag clicks / the viewer). RLS-gated, so a
// confidential row returns null for a viewer without can_view_confidential.
export async function fetchAttachmentById(id: string): Promise<AttachmentRow | null> {
  const { data, error } = await supabase.from('attachments').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 600)
  if (error) throw error
  return data.signedUrl
}

export async function toggleAttachmentVisibility(id: string, clientVisible: boolean): Promise<AttachmentRow> {
  const { data, error } = await supabase
    .from('attachments')
    .update({ client_visible: clientVisible })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Link rows (a Google Doc) have no storage object, so only files touch the bucket.
 *
 * As in chat, the bucket call is the fast path rather than the guarantee:
 * trg_attachments_queue_cleanup queues the file when the row goes, whatever
 * removed it, including a cascade from the project or task.
 */
export async function deleteAttachment(id: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase.from('attachments').delete().eq('id', id)
  if (error) throw error
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath])
}

export interface AddLinkArgs {
  /** Exactly one of `projectId` / `leadId` / `bdTaskId` — the CHECK on the table enforces it. */
  projectId?: string
  leadId?: string
  bdTaskId?: string
  taskId?: string | null
  title: string
  url: string
  isConfidential?: boolean
  clientVisible?: boolean
}

/**
 * Attach an external document (Google Doc/Sheet/Slide, Drive, any URL). Stored in
 * `attachments` with kind='link' so it lists alongside uploaded files and inherits
 * the same RLS — including the confidential filter.
 */
export async function addAttachmentLink(args: AddLinkArgs): Promise<AttachmentRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      project_id: args.projectId ?? null,
      lead_id: args.leadId ?? null,
      bd_task_id: args.bdTaskId ?? null,
      task_id: args.taskId ?? null,
      uploader_id: auth.user?.id ?? null,
      // Falls back to the address itself, so a link is never listed as "".
      file_name: args.title.trim() || args.url.trim(),
      kind: 'link',
      link_url: args.url.trim(),
      is_confidential: args.isConfidential ?? false,
      client_visible: args.clientVisible ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * The title behind a pasted link, so the Add-document form can fill it in.
 *
 * Runs through the `link-title` edge function because the browser cannot read
 * the <title> of docs.google.com — no CORS headers — and because a URL supplied
 * by a user must be fetched somewhere that can refuse to call our own network.
 *
 * Returns null whenever the page cannot be read or the title is a sign-in wall.
 * That is an ordinary outcome, not an error: the user types the title instead.
 */
export async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ title: string | null }>(
      'link-title',
      { body: { url } },
    )
    if (error) return null
    return data?.title ?? null
  } catch {
    return null
  }
}

// Guarded server-side by trg_guard_attachment_confidential: callers without
// can_view_confidential get 'forbidden_confidential'.
export async function setAttachmentConfidential(id: string, isConfidential: boolean): Promise<AttachmentRow> {
  const { data, error } = await supabase
    .from('attachments')
    .update({ is_confidential: isConfidential })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
