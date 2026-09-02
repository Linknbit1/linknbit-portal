-- One reaction per person per message, and reactions that leave with the message.
--
-- Two behaviours people expect from a chat app that this did not have:
--
--   1. Picking a second emoji REPLACES your first rather than adding beside it.
--      The old unique key was (message_id, profile_id, emoji), which permitted a
--      row per emoji per person, so one reader could stack six pills on a message.
--   2. Deleting a message takes its reactions with it. The FK already cascades,
--      but messages are soft-deleted (deleted_at), so the cascade never fired and
--      the reactions outlived the message they belonged to.

-- ── Data first: the constraint below cannot be added over rows that break it ──

-- Reactions on messages that were deleted before this migration existed.
DELETE FROM message_reactions r
USING messages m
WHERE m.id = r.message_id AND m.deleted_at IS NOT NULL;

-- Where somebody reacted more than once to the same message, their most recent
-- one is the one they meant — that is the reaction the new rule would leave.
DELETE FROM message_reactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY message_id, profile_id ORDER BY created_at DESC, id DESC
    ) AS rn
    FROM message_reactions
  ) ranked
  WHERE rn > 1
);

-- ── The rule itself ──────────────────────────────────────────────────────────

-- Subsumed by the stricter key below: anything it forbade, the new one forbids.
ALTER TABLE message_reactions
  DROP CONSTRAINT IF EXISTS message_reactions_message_id_profile_id_emoji_key;

ALTER TABLE message_reactions
  ADD CONSTRAINT message_reactions_one_per_person UNIQUE (message_id, profile_id);

-- ── Toggle becomes a three-way ───────────────────────────────────────────────
--
-- Same emoji you already picked  → taken off  (returns false)
-- A different emoji              → replaces yours (returns true)
-- Nothing yet                    → added      (returns true)
--
-- Still one round trip, so a double-click cannot race itself into two rows.
CREATE OR REPLACE FUNCTION fn_toggle_reaction(p_message_id uuid, p_emoji text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_me         uuid := auth.uid();
  v_channel_id uuid;
  v_existing   text;
BEGIN
  IF p_emoji IS NULL OR length(p_emoji) < 1 OR length(p_emoji) > 16 THEN
    RAISE EXCEPTION 'invalid_emoji';
  END IF;

  SELECT channel_id INTO v_channel_id FROM messages WHERE id = p_message_id AND deleted_at IS NULL;
  IF v_channel_id IS NULL THEN
    RAISE EXCEPTION 'unknown_message';
  END IF;

  IF NOT is_channel_member(v_channel_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT emoji INTO v_existing
  FROM message_reactions
  WHERE message_id = p_message_id AND profile_id = v_me;

  IF v_existing IS NOT NULL THEN
    DELETE FROM message_reactions
    WHERE message_id = p_message_id AND profile_id = v_me;

    -- Pressing your own reaction again means "take it off", and stops there.
    IF v_existing = p_emoji THEN
      RETURN false;
    END IF;
  END IF;

  INSERT INTO message_reactions (message_id, channel_id, profile_id, emoji)
  VALUES (p_message_id, v_channel_id, v_me, p_emoji);
  RETURN true;
END;
$function$;

-- ── Soft delete has to cascade by hand ───────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_clear_reactions_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM message_reactions WHERE message_id = NEW.id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_clear_reactions_on_delete ON messages;
CREATE TRIGGER trg_clear_reactions_on_delete
  AFTER UPDATE OF deleted_at ON messages
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION fn_clear_reactions_on_delete();
