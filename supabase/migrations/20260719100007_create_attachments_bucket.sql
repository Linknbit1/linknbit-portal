-- ════════════════════════════════════════════════════════════════════
-- Private `attachments` storage bucket for project/task files. Unlike the
-- public `avatars` bucket, this is private — files are served via
-- short-lived signed URLs generated in src/api/attachments.ts. Object
-- access is limited to authenticated internal users; the client_visible
-- gate lives on the attachments table row (clients read via signed URLs
-- the app produces once the row passes RLS). Path convention:
-- <project_id>/<task_id-or-'project'>/<uuid>-<filename>
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 26214400,  -- 25 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed'
    ]
where id = 'attachments';

create policy "attachments_internal_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and is_internal());

create policy "attachments_internal_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and is_internal());

create policy "attachments_internal_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and is_internal())
  with check (bucket_id = 'attachments' and is_internal());

create policy "attachments_internal_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and is_internal());
