-- Uploading a task file failed for whole categories of file, with no useful
-- reason shown.
--
-- src/lib/attachment.ts accepts a file when its extension is in ALLOWED_EXT, and
-- that list carries `rar` and `7z`. The bucket's allowed_mime_types does not.
-- Worse, EXT_MIME has no entry for either, so inferContentType() returns
-- application/octet-stream, which the bucket rejects on sight. The client said
-- yes, storage said no, and the person saw "upload failed".
--
-- The comment above ALLOWED_EXT even says it "must stay a subset of the bucket's
-- allowed_mime_types or the upload still fails server-side". It had drifted out
-- of being one.
--
-- Also brings the task bucket in line with chat on HEIC and AVIF. A photo taken
-- on an iPhone is image/heic: it could be posted into a conversation but not
-- attached to the task the conversation was about, which is the kind of
-- inconsistency nobody reports as a bug because it just reads as broken.
UPDATE storage.buckets
   SET allowed_mime_types = allowed_mime_types || ARRAY[
     'image/heic',
     'image/avif',
     -- Both spellings: browsers and operating systems disagree about rar.
     'application/vnd.rar',
     'application/x-rar-compressed',
     'application/x-7z-compressed'
   ]
 WHERE id = 'attachments'
   AND NOT (allowed_mime_types @> ARRAY['image/heic']);
