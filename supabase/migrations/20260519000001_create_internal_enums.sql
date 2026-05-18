-- Internal-only state enums: implementation details, never user-facing, values will not change.
-- Domain types (user_role, service_type, task_status, etc.) are text + CHECK on each table.
CREATE TYPE sync_state        AS ENUM ('synced', 'pending', 'error');
CREATE TYPE sync_operation    AS ENUM ('create', 'update', 'delete');
CREATE TYPE queue_status      AS ENUM ('pending', 'processing', 'done', 'failed');
CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'fulfilled', 'rejected');
