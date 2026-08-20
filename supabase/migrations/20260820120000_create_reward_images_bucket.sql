-- ════════════════════════════════════════════════════════════════════
-- Public `reward-images` bucket for the gamification rewards catalog.
--
-- Reads are public so a shop card renders the image without an extra
-- authenticated round-trip (same reasoning as `avatars`). Writes are
-- restricted to gamification governors — the same capability that owns
-- the rewards table itself (p_rewards_write / can_govern_gamification()),
-- so a governor can replace or delete another governor's upload.
--
-- Path convention: reward-images/<uuid>.<ext> — flat, because a reward's
-- id does not exist yet while the create modal is uploading.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('reward-images', 'reward-images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880,  -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'reward-images';

create policy "reward_images_public_read"
  on storage.objects for select
  using (bucket_id = 'reward-images');

create policy "reward_images_governor_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reward-images' and can_govern_gamification());

create policy "reward_images_governor_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'reward-images' and can_govern_gamification())
  with check (bucket_id = 'reward-images' and can_govern_gamification());

create policy "reward_images_governor_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'reward-images' and can_govern_gamification());
