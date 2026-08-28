-- The janitor's shared secret lives in Vault and nowhere else.
--
-- fn_request_storage_cleanup already reads it there to SEND it; this is the
-- other half, so the storage-janitor function can check what it received
-- without the secret having a second home in a function env var that can drift
-- out of step, or be absent while the endpoint is already live. The env-var
-- version had an `if (SECRET && ...)` shape, which fails OPEN when the variable
-- is unset: exactly the state a freshly deployed function is in.
--
-- Returns a boolean, never the secret. Granted to service_role alone: the edge
-- function is the only caller, and an authenticated user must not be able to
-- sit and guess against it.
CREATE OR REPLACE FUNCTION public.fn_verify_janitor_secret(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_expected text;
BEGIN
  SELECT decrypted_secret INTO v_expected
    FROM vault.decrypted_secrets WHERE name = 'janitor_hook_secret';

  -- Unset means unconfigured, and unconfigured must fail closed. An empty
  -- expectation matching an empty header would let anybody in.
  IF v_expected IS NULL OR v_expected = '' THEN RETURN false; END IF;

  RETURN p_secret = v_expected;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_verify_janitor_secret(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_janitor_secret(text) TO service_role;

-- Configure it. gen_random_bytes gives a secret nobody has ever typed or seen,
-- which is the point of generating it in here rather than pasting one in.
SELECT vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'janitor_hook_secret',
  'Shared secret sent as x-janitor-secret; checked by fn_verify_janitor_secret'
)
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'janitor_hook_secret');

-- Replace the project ref if this is ever restored into a different project.
SELECT vault.create_secret(
  'https://pifsboyhheazpccyliwy.supabase.co/functions/v1/storage-janitor',
  'janitor_hook_url',
  'Endpoint the drain-storage-cleanup cron posts to'
)
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'janitor_hook_url');
