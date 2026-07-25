-- ════════════════════════════════════════════════════════════════════
-- Private `chat-attachments` bucket. Separate from `attachments` (project
-- files) on purpose: chat allows much larger files (100 MB vs 25 MB) and a
-- looser media allowlist, and mixing the two would force the stricter
-- project-file rules to loosen. Served via short-lived signed URLs.
-- Files over 10 MB upload through the resumable (TUS) endpoint — same
-- bucket, same policies, only a different transfer protocol.
-- Path convention: <channel_id>/<uuid>-<filename>
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 104857600,  -- 100 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/markdown',
      'application/json',
      'application/zip', 'application/x-zip-compressed', 'application/gzip'
    ]
where id = 'chat-attachments';

create policy "chat_attachments_internal_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments' and is_internal());

create policy "chat_attachments_internal_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-attachments' and is_internal());

create policy "chat_attachments_internal_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-attachments' and is_internal())
  with check (bucket_id = 'chat-attachments' and is_internal());

create policy "chat_attachments_internal_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-attachments' and is_internal());
