# Linknbit Portal — Backend Architecture

> **Stack:** Supabase (Postgres + RLS + Realtime + Edge Functions + Storage) · ClickUp API v2 · Discord Webhook
> **Date:** 2026-05-19
> **Status:** Draft — pre-implementation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Role-Based Access Control](#2-role-based-access-control)
3. [Database Schema](#3-database-schema)
4. [ClickUp Integration](#4-clickup-integration)
5. [Discord Integration](#5-discord-integration)
6. [Real-time Strategy](#6-real-time-strategy)
7. [Audit Logging](#7-audit-logging)
8. [Supabase Edge Functions](#8-supabase-edge-functions)
9. [Sync Queue & Conflict Resolution](#9-sync-queue--conflict-resolution)
10. [Row Level Security Policies](#10-row-level-security-policies)
11. [SaaS Scalability](#11-saas-scalability)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     React Frontend                        │
│         (Vite + React Router + Supabase JS Client)        │
└────────────┬──────────────────────────┬───────────────────┘
             │ Realtime (WebSocket)      │ REST / RPC
             ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│                        SUPABASE                           │
│                                                           │
│  PostgreSQL (RLS)        Realtime        Edge Functions   │
│  ├── profiles            ├── comments    ├── clickup-webhook
│  ├── projects            └── notifs      ├── clickup-sync-worker
│  ├── tasks                              ├── file-proxy   │
│  ├── comments            Storage        ├── discord-audit-post
│  ├── audit_logs*         └── task-attachments            │
│  ├── sync_queue              avatars    └── quest-evaluator
│  └── integrations                                        │
│                                                           │
│  * partitioned by month                                   │
└────────────────────────┬─────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
  ┌───────────────┐           ┌──────────────────┐
  │  ClickUp API  │           │  Discord Webhook  │
  │  v2 + Webhooks│           │  (audit logs only)│
  └───────────────┘           └──────────────────┘
```

### Data Flow

| Direction | Trigger | What happens |
|-----------|---------|--------------|
| Portal → ClickUp | User creates/edits task or comment | Saved to Supabase first → sync queue → ClickUp REST API |
| ClickUp → Portal | User edits directly in ClickUp | ClickUp webhook → Edge Fn → upsert Supabase (source flagged) → Realtime pushes to browser |
| Portal → Discord | Audit log written | Edge Fn optionally POSTs formatted embed to Discord channel webhook |
| File access | User or ClickUp link click | `file-proxy` Edge Fn verifies auth → generates fresh signed URL → 302 redirect |

---

## 2. Role-Based Access Control

**Decision: system-native RBAC via Supabase RLS. Discord plays no role in access control.**

Discord has no login, no OAuth, no role sync. It only receives audit log messages via a webhook URL configured in Settings.

### Role Hierarchy

```
super_admin
  └─ admin / ops_manager
       └─ project_manager
            └─ team_lead
                 └─ employee
client_owner
  └─ client_member
```

`user_role` is kept as a PostgreSQL enum — it is security-critical and values must be explicitly controlled. Adding a new role is intentional and requires a migration, which is the correct behaviour.

`service_type` is also kept as an enum for the same reason.

All other formerly-enum types (`task_status`, `audit_action`, `priority_level`, `project_status`) are converted to `text` with `CHECK` constraints so new values can be added without migrations.

---

## 3. Database Schema

### Types

```sql
-- Kept as enums: security-critical, intentionally rigid
CREATE TYPE user_role AS ENUM (
  'super_admin', 'admin', 'project_manager',
  'team_lead', 'employee', 'client_owner', 'client_member'
);
CREATE TYPE service_type AS ENUM ('design', 'development', 'marketing');

-- Converted to text + CHECK: will grow over time, migrations would be painful
-- task_status, audit_action, priority_level, project_status are plain text columns
-- with CHECK constraints defined inline on each table.

-- Internal-only state enums: stable, never user-facing
CREATE TYPE sync_state     AS ENUM ('synced', 'pending', 'error');
CREATE TYPE sync_operation AS ENUM ('create', 'update', 'delete');
CREATE TYPE queue_status   AS ENUM ('pending', 'processing', 'done', 'failed');
CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'fulfilled', 'rejected');
```

### Tables

```sql
-- ─────────────────────────────────────────
-- LEVELS  (XP threshold table — admin-editable)
-- ─────────────────────────────────────────
CREATE TABLE levels (
  level        int PRIMARY KEY,
  xp_required  int NOT NULL,
  label        text              -- optional display name, e.g. "Senior Dev"
);

INSERT INTO levels (level, xp_required) VALUES
  (1,    0), (2,  500), (3, 1200), (4, 2500),
  (5, 4500), (6, 7500), (7, 11500), (8, 17000),
  (9, 24000), (10, 33000);

-- ─────────────────────────────────────────
-- PROFILES  (extends auth.users)
-- ─────────────────────────────────────────
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  avatar_url      text,
  role            user_role NOT NULL DEFAULT 'employee',
  service_type    service_type,
  team_id         uuid,
  clickup_user_id text,
  xp_total        int NOT NULL DEFAULT 0,
  level           int NOT NULL DEFAULT 1 REFERENCES levels(level),
  is_active       boolean NOT NULL DEFAULT true,
  last_seen_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger: recompute level whenever xp_total changes
CREATE OR REPLACE FUNCTION fn_sync_profile_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := (
    SELECT MAX(level) FROM levels WHERE xp_required <= NEW.xp_total
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profile_level_sync
  BEFORE UPDATE OF xp_total ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_sync_profile_level();

-- Trigger: update xp_total when an xp_transaction is inserted
-- xp_total is a cached counter; xp_transactions is the source of truth
CREATE OR REPLACE FUNCTION fn_apply_xp_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET xp_total = xp_total + NEW.amount
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_apply_xp
  AFTER INSERT ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_apply_xp_transaction();

-- ─────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────
CREATE TABLE teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  service_type service_type NOT NULL,
  lead_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD CONSTRAINT fk_profiles_team
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
CREATE TABLE clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  logo_url      text,
  contact_email text,
  contact_name  text,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_members (
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, profile_id)
);

-- ─────────────────────────────────────────
-- PROJECTS  (maps to a ClickUp List)
-- ─────────────────────────────────────────
CREATE TABLE projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text,
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  service_type   service_type NOT NULL,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft','active','on_hold','completed','cancelled')),
  team_id        uuid REFERENCES teams(id) ON DELETE SET NULL,
  manager_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  start_date     date,
  due_date       date,
  client_visible boolean NOT NULL DEFAULT false,

  -- ClickUp hierarchy IDs
  clickup_list_id   text UNIQUE,
  clickup_folder_id text,
  clickup_space_id  text,

  -- Soft delete
  deleted_at  timestamptz,
  deleted_by  uuid REFERENCES profiles(id),

  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, profile_id)
);

-- ─────────────────────────────────────────
-- TASKS  (bidirectional sync with ClickUp)
-- ─────────────────────────────────────────
CREATE TABLE tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_task_id text UNIQUE,
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,

  title          text NOT NULL,
  description    text,
  status         text NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('backlog','todo','in_progress','review',
                                     'approved','completed','blocked')),
  priority       text NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('critical','high','medium','low')),
  due_date       timestamptz,
  start_date     timestamptz,
  estimated_minutes int,
  client_visible boolean NOT NULL DEFAULT false,

  -- Sync tracking
  sync_state              sync_state NOT NULL DEFAULT 'pending',
  sync_error_message      text,
  last_synced_at          timestamptz,
  -- Set via session variable; BEFORE trigger enforces the default.
  -- Never trust app code alone to set this correctly.
  last_updated_by_source  text NOT NULL DEFAULT 'portal'
                            CHECK (last_updated_by_source IN ('portal','clickup')),

  -- Soft delete
  deleted_at  timestamptz,
  deleted_by  uuid REFERENCES profiles(id),

  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- BEFORE trigger: sets last_updated_by_source from a session variable.
-- The clickup-webhook Edge Fn sets: SET LOCAL app.update_source = 'clickup'
-- All other writers get the default 'portal'.
-- This is more reliable than trusting every call site to set the column.
CREATE OR REPLACE FUNCTION fn_set_update_source()
RETURNS TRIGGER AS $$
DECLARE
  v_source text;
BEGIN
  v_source := NULLIF(current_setting('app.update_source', true), '');
  NEW.last_updated_by_source := COALESCE(v_source, 'portal');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_set_source
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_set_update_source();

CREATE TRIGGER trg_comments_set_source
  BEFORE INSERT OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_set_update_source();

CREATE TABLE task_assignees (
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_id)
);

-- ─────────────────────────────────────────
-- CLICKUP STATUS MAPPING
-- Maps ClickUp's custom status strings to portal status values.
-- Populated automatically on ClickUp connect; editable in Settings.
-- ─────────────────────────────────────────
CREATE TABLE clickup_status_mappings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_status  text NOT NULL,   -- e.g. "In Review", "Needs QA"
  portal_status   text NOT NULL
                    CHECK (portal_status IN ('backlog','todo','in_progress','review',
                                            'approved','completed','blocked')),
  UNIQUE (clickup_status)
);

-- ─────────────────────────────────────────
-- CHECKLISTS
-- ─────────────────────────────────────────
CREATE TABLE checklists (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_checklist_id text UNIQUE,
  task_id              uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  order_index          int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE checklist_items (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_checklist_item_id text UNIQUE,
  checklist_id              uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  resolved                  boolean NOT NULL DEFAULT false,
  assignee_id               uuid REFERENCES profiles(id),
  order_index               int NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- COMMENTS  (bidirectional sync with ClickUp)
-- ─────────────────────────────────────────
CREATE TABLE comments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_comment_id    text UNIQUE,
  task_id               uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content               text NOT NULL,
  client_visible        boolean NOT NULL DEFAULT false,
  sync_state            sync_state NOT NULL DEFAULT 'pending',
  -- Set via the same session-variable BEFORE trigger as tasks
  last_updated_by_source text NOT NULL DEFAULT 'portal'
                           CHECK (last_updated_by_source IN ('portal','clickup')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- ATTACHMENTS
-- Files are stored in Supabase Storage.
-- Access via file-proxy Edge Function — links never expire.
-- A ClickUp comment with the proxy URL is posted instead of uploading the file.
-- ─────────────────────────────────────────
CREATE TABLE attachments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploader_id        uuid REFERENCES profiles(id),
  file_name          text NOT NULL,
  file_size          bigint NOT NULL,
  mime_type          text NOT NULL,
  storage_path       text NOT NULL,       -- Supabase Storage object path
  client_visible     boolean NOT NULL DEFAULT false,
  clickup_comment_id text,               -- ClickUp comment that holds the proxy link
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- AUDIT LOGS  (append-only, partitioned by month)
-- ─────────────────────────────────────────
-- Partitioned table: each month is a child partition.
-- Queries on recent data hit only the current partition.
-- Old partitions can be detached and archived to S3 without data loss.
CREATE TABLE audit_logs (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id       uuid,           -- NULL when source = 'clickup' or 'system'
  actor_role     user_role,      -- denormalized snapshot at time of action
  action         text NOT NULL,  -- text not enum: new action types added freely
  resource_type  text NOT NULL,
  resource_id    text NOT NULL,
  resource_label text,
  -- Stores only changed fields, not the full row.
  -- On INSERT: new_value holds all fields. On UPDATE: only differing fields.
  old_value      jsonb,
  new_value      jsonb,
  source         text NOT NULL DEFAULT 'portal'
                   CHECK (source IN ('portal','clickup','system')),
  ip_address     inet,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create current and next month partitions at deploy time.
-- A monthly cron creates future partitions automatically.
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Indexes on the parent propagate to all partitions automatically
CREATE INDEX idx_audit_actor    ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action   ON audit_logs(action, created_at DESC);

-- ─────────────────────────────────────────
-- GAMIFICATION
-- ─────────────────────────────────────────
CREATE TABLE xp_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount     int NOT NULL,            -- positive = earned, negative = spent
  reason     text NOT NULL,
  task_id    uuid REFERENCES tasks(id) ON DELETE SET NULL,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
  -- Immutable ledger: no updated_at, no soft-delete. Corrections via reversal entries.
);

CREATE TABLE rewards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  xp_cost     int NOT NULL CHECK (xp_cost > 0),
  quantity    int DEFAULT -1 CHECK (quantity >= -1),  -- -1 = unlimited
  image_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reward_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id   uuid NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  xp_spent    int NOT NULL,
  status      redemption_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Atomic redemption function: locks the profile row and the reward row
-- before deducting XP and decrementing quantity. Prevents race conditions.
CREATE OR REPLACE FUNCTION redeem_reward(p_profile_id uuid, p_reward_id uuid)
RETURNS uuid AS $$
DECLARE
  v_reward       rewards%ROWTYPE;
  v_xp_total     int;
  v_redemption_id uuid;
BEGIN
  -- Lock reward row to prevent concurrent quantity over-decrement
  SELECT * INTO v_reward FROM rewards
  WHERE id = p_reward_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reward_not_found';
  END IF;

  IF v_reward.quantity = 0 THEN
    RAISE EXCEPTION 'reward_out_of_stock';
  END IF;

  -- Lock profile row to prevent concurrent XP over-spend
  SELECT xp_total INTO v_xp_total FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_xp_total < v_reward.xp_cost THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  -- Decrement quantity (skip if unlimited)
  IF v_reward.quantity > 0 THEN
    UPDATE rewards SET quantity = quantity - 1 WHERE id = p_reward_id;
  END IF;

  -- Deduct XP via transaction (trigger updates xp_total)
  INSERT INTO xp_transactions (profile_id, amount, reason)
  VALUES (p_profile_id, -v_reward.xp_cost, 'Reward redemption: ' || v_reward.name);

  -- Create redemption record
  INSERT INTO reward_redemptions (profile_id, reward_id, xp_spent)
  VALUES (p_profile_id, p_reward_id, v_reward.xp_cost)
  RETURNING id INTO v_redemption_id;

  RETURN v_redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────
-- QUESTS
-- ─────────────────────────────────────────
CREATE TABLE quests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  xp_reward       int NOT NULL CHECK (xp_reward > 0),
  condition_type  text NOT NULL
                    CHECK (condition_type IN ('tasks_completed','on_time_streak','comments_added','tasks_reviewed')),
  condition_value jsonb NOT NULL,  -- e.g. { "count": 5 } or { "streak_days": 7 }
  is_active       boolean NOT NULL DEFAULT true,
  repeatable      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quest_progress (
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id     uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress     int NOT NULL DEFAULT 0,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  PRIMARY KEY (profile_id, quest_id)
);

-- Quest evaluation: count-based quests evaluated by trigger on relevant tables.
-- Streak-based quests evaluated by a scheduled Edge Function (quest-evaluator) daily.
-- See Section 8 for the quest-evaluator function.

-- ─────────────────────────────────────────
-- IN-APP NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  body          text,
  resource_type text,
  resource_id   text,
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_profile ON notifications(profile_id, read, created_at DESC);

-- Nightly cron: delete read notifications older than 90 days to keep table small
-- DELETE FROM notifications WHERE read = true AND created_at < now() - interval '90 days';

-- ─────────────────────────────────────────
-- CLICKUP OUTBOUND SYNC QUEUE
-- ─────────────────────────────────────────
CREATE TABLE clickup_sync_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation         sync_operation NOT NULL,
  resource_type     text NOT NULL CHECK (resource_type IN ('task','comment','attachment_link','project')),
  local_resource_id text NOT NULL,
  clickup_id        text,
  payload           jsonb NOT NULL,
  -- depends_on: subtask or comment waits until parent task is 'done'
  depends_on        uuid REFERENCES clickup_sync_queue(id) ON DELETE SET NULL,
  status            queue_status NOT NULL DEFAULT 'pending',
  attempts          int NOT NULL DEFAULT 0,
  max_attempts      int NOT NULL DEFAULT 3,
  next_attempt_at   timestamptz NOT NULL DEFAULT now(),  -- backoff timestamp
  last_attempted_at timestamptz,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Worker uses FOR UPDATE SKIP LOCKED: safe for concurrent invocations
CREATE INDEX idx_sync_queue_ready ON clickup_sync_queue(next_attempt_at, status)
  WHERE status IN ('pending', 'processing');

-- ─────────────────────────────────────────
-- INTEGRATIONS  (singleton row — one per workspace)
-- ─────────────────────────────────────────
-- The singleton boolean PRIMARY KEY enforces exactly one row.
-- INSERT a second row raises a duplicate key error.
CREATE TABLE integrations (
  singleton              boolean PRIMARY KEY DEFAULT true CHECK (singleton),

  -- ClickUp (credentials stored as Vault secret IDs, not raw values)
  clickup_team_id        text,
  clickup_api_token_secret_id  text,   -- Vault secret ID, not the token itself
  clickup_webhook_id     text,
  clickup_space_id       text,
  clickup_webhook_secret_id    text,   -- Vault secret ID for HMAC verification
  clickup_connected_at   timestamptz,

  -- Discord (credential stored as Vault secret ID)
  discord_webhook_secret_id    text,   -- Vault secret ID for webhook URL
  discord_audit_enabled  boolean NOT NULL DEFAULT false,
  -- JSON array of audit_action values to forward to Discord.
  -- Empty array = forward all. Configurable in Settings.
  discord_audit_filter   jsonb NOT NULL DEFAULT '[]',
  discord_connected_at   timestamptz,

  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Key Indexes

```sql
CREATE INDEX idx_tasks_project      ON tasks(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_clickup      ON tasks(clickup_task_id) WHERE clickup_task_id IS NOT NULL;
CREATE INDEX idx_tasks_sync_pending ON tasks(sync_state) WHERE sync_state = 'pending';
CREATE INDEX idx_tasks_parent       ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_trash        ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_comments_task      ON comments(task_id, created_at);
CREATE INDEX idx_projects_client    ON projects(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_clickup   ON projects(clickup_list_id) WHERE clickup_list_id IS NOT NULL;
CREATE INDEX idx_projects_trash     ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
```

---

## 4. ClickUp Integration

### What ClickUp Supports

| Resource | Create | Read | Update | Delete | Webhooks |
|----------|--------|------|--------|--------|----------|
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subtasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Checklists | ✅ | ✅ | ✅ | ✅ | ❌ no webhook |
| Lists (Projects) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attachments | — | — | — | — | — |

**Attachments are not synced to ClickUp.** Files go to Supabase Storage. The `file-proxy` Edge Function serves them via expiry-free proxy links. A ClickUp comment is posted with the proxy URL. ClickUp's 100MB storage cap is never touched.

**Rate limit:** 100 req/min on Free/Business. Handled by the sync queue with exponential backoff.

**Folders are read-only via API.** When a project is created in the portal, it is created as a ClickUp List directly inside the configured default Space — not inside a Folder. Folder organisation in ClickUp must be done manually.

### Bidirectional Sync Flow

```
Portal action                           ClickUp action
     │                                       │
     ▼                                       ▼
INSERT/UPDATE task                   ClickUp fires webhook
BEFORE trigger: source = 'portal'           │
sync_state = 'pending'                      ▼
     │                              Edge Fn: clickup-webhook
     ▼                              SET LOCAL app.update_source = 'clickup'
Postgres AFTER trigger:                     │
  NEW.last_updated_by_source = 'portal'     ▼
  → enqueue in clickup_sync_queue    BEFORE trigger: source = 'clickup'
     │                               AFTER trigger: source = 'clickup'
     ▼                                 → does NOT enqueue sync job
Edge Fn: clickup-sync-worker                │
  SELECT ... FOR UPDATE SKIP LOCKED         ▼
     │                              UPSERT tasks/comments
     ├─ Calls ClickUp REST API      (only if incoming timestamp is newer)
     ├─ On success:                         │
     │   sync_state = 'synced'       Realtime broadcasts to open browsers
     │   clickup_task_id = <id>      Audit log: source = 'clickup'
     └─ On failure:
         attempts++, backoff
         After max_attempts:
           sync_state = 'error'
           cascade: set dependent
           queue items to 'failed'
           notify user in-app
```

### Echo Loop Prevention (Session Variable Pattern)

The webhook Edge Function wraps its DB write in a transaction and sets a session variable before the write. The BEFORE trigger on `tasks` and `comments` reads this variable to set `last_updated_by_source`. The AFTER trigger that enqueues sync jobs checks this value and skips enqueueing when source is `'clickup'`.

This is more reliable than expecting every call site to set the column correctly.

```typescript
// Inside clickup-webhook Edge Function
await supabase.rpc('process_clickup_task_update', {
  p_clickup_task_id: event.task_id,
  p_title: event.task.name,
  // ... other fields
});

// The RPC function:
// BEGIN;
// SET LOCAL app.update_source = 'clickup';
// UPDATE tasks SET ... WHERE clickup_task_id = p_clickup_task_id;
// COMMIT;
```

### ClickUp Status Mapping

ClickUp statuses are custom strings per workspace ("In Review", "Needs QA", etc.). They cannot be hardcoded in the portal. On ClickUp connect:

1. Fetch all statuses from the configured Space via `GET /api/v2/space/{space_id}/tag`
2. Auto-populate `clickup_status_mappings` with smart defaults (case-insensitive string matching)
3. Show the mapping table in Settings for admin review and manual correction

The sync worker reads from `clickup_status_mappings` when:
- Writing to ClickUp: translate portal status → ClickUp status string
- Reading from webhook: translate ClickUp status string → portal status

If a ClickUp status arrives with no mapping entry, the status update is skipped and logged as a warning in audit_logs. The admin is notified to add a mapping in Settings.

### Handling `taskMoved` Webhook

When a task is moved between ClickUp Lists (which corresponds to changing its project), the portal must update `tasks.project_id`:

1. Webhook event `taskMoved` arrives with the new `list.id`
2. Look up `projects` where `clickup_list_id = event.list.id`
3. If the List maps to a known project: `UPDATE tasks SET project_id = <found_id>`
4. If the List has no matching project: create a placeholder project or log a warning and skip

### Dependency Cascade on Sync Failure

When a queue item fails after `max_attempts`, all items that `depends_on` it are unreachable. A cascading failure handler runs as part of the sync worker after marking an item `failed`:

```sql
-- Recursively mark all dependents as failed
WITH RECURSIVE dependents AS (
  SELECT id FROM clickup_sync_queue WHERE depends_on = $1  -- the failed item
  UNION ALL
  SELECT q.id FROM clickup_sync_queue q
  JOIN dependents d ON q.depends_on = d.id
)
UPDATE clickup_sync_queue
SET status = 'failed',
    error_message = 'Parent sync item failed'
WHERE id IN (SELECT id FROM dependents);
```

### Bootstrap Sync (Initial ClickUp Import)

When ClickUp is first connected, existing tasks are not in the portal. The `clickup-sync-worker` runs a one-time import on connect:

1. Paginate through all Lists in the configured Space
2. For each List: create or match a `projects` row via `clickup_list_id`
3. For each List: paginate through all tasks and subtasks
4. For each task: upsert into `tasks` with `last_updated_by_source = 'clickup'`
5. For each task: fetch and upsert comments
6. Record progress in a `bootstrap_sync_log` key in `integrations.metadata` so a restart resumes where it left off

This import runs at low priority (200ms delay between pages) to avoid hitting the 100 req/min rate limit during normal operations.

### Webhook Registration (one-time on Connect)

```
POST https://api.clickup.com/api/v2/team/{team_id}/webhook
{
  "endpoint": "https://<project>.supabase.co/functions/v1/clickup-webhook",
  "events": [
    "taskCreated", "taskUpdated", "taskDeleted",
    "taskStatusUpdated", "taskPriorityUpdated", "taskAssigneeUpdated",
    "taskDueDateUpdated", "taskMoved",
    "taskCommentPosted", "taskCommentUpdated",
    "taskTimeEstimateUpdated", "taskTimeTrackedUpdated",
    "listCreated", "listUpdated", "listDeleted"
  ]
}
```

The returned `webhook_id` and the HMAC secret are stored in Supabase Vault (not in the `integrations` table as plain text). The `integrations` table holds only the Vault secret IDs.

On webhook disconnect (Settings), the registered webhook is deleted via `DELETE /api/v2/webhook/{webhook_id}` before clearing the integration row.

---

## 5. Discord Integration

Discord is connected via Settings by pasting in a Discord channel webhook URL. The URL is stored in Supabase Vault; only its Vault secret ID is stored in `integrations`.

```
Settings page
  └─ "Connect Discord" section
       ├─ Paste Discord webhook URL
       ├─ Toggle: Post audit logs to this channel
       ├─ Filter: which action types to forward (multi-select)
       └─ Test button → sends a test message
```

The `discord-audit-post` Edge Function:
1. Reads `integrations.discord_audit_enabled` and `discord_audit_filter`
2. Skips if disabled or if action not in filter
3. Fetches the webhook URL from Vault
4. POSTs a Discord embed to the URL
5. Fire-and-forget — failure is logged in `audit_logs` with `source = 'system'` but never blocks the portal

**What gets posted:**

```
[ACTION] Role changed
Actor:    Ahmad Karimi (Admin)
Resource: Sara Qureshi (Profile)
Detail:   employee → project_manager
Time:     2026-05-19 14:32 PKT
```

---

## 6. Real-time Strategy

### Channel Separation: `postgres_changes` vs Broadcast

`postgres_changes` evaluates RLS for every row change across all subscribers. On high-write tables this creates overhead on Supabase's Realtime multiplexer.

| Feature | Channel Type | Reason |
|---------|-------------|--------|
| Comments live | `postgres_changes` | Low frequency per task; RLS check acceptable |
| Notification bell | `postgres_changes` | Per-user filter; very low frequency |
| Task status on board | **Broadcast** | High frequency during standup; skip RLS overhead |
| Sync badge update | **Broadcast** | Pushed by sync worker on completion |
| Checklist resolved | `postgres_changes` | Low frequency |

For Broadcast channels, the mutation handler (RPC or Edge Function) explicitly pushes to the channel after writing to the DB. The client receives the event and updates local state — no RLS evaluation per subscriber.

### `postgres_changes` Subscription Pattern

```typescript
// Comments — postgres_changes (low frequency, RLS needed)
const channel = supabase
  .channel(`comments:${taskId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
    (payload) => {
      if (payload.eventType === 'INSERT') addComment(payload.new);
      if (payload.eventType === 'UPDATE') updateComment(payload.new);
      if (payload.eventType === 'DELETE') removeComment(payload.old.id);
    }
  )
  .subscribe();

return () => supabase.removeChannel(channel);
```

### Broadcast Pattern (Task Board Status)

```typescript
// Subscribe
const boardChannel = supabase.channel(`board:${projectId}`)
  .on('broadcast', { event: 'task_status_changed' }, ({ payload }) => {
    updateTaskOnBoard(payload.task_id, payload.new_status);
  })
  .subscribe();

// Server side (inside a mutation RPC or Edge Function), after updating the DB:
await supabase.channel(`board:${projectId}`).send({
  type: 'broadcast',
  event: 'task_status_changed',
  payload: { task_id, new_status, updated_by },
});
```

### Connection Management

Each open browser tab creates WebSocket connections. To avoid hitting Supabase free-tier connection limits:
- Consolidate all subscriptions for a page into a single channel where possible
- Always call `supabase.removeChannel(channel)` in cleanup (`useEffect` return)
- Use a shared Realtime client instance (not one per component)

---

## 7. Audit Logging

### Design Principles

1. **Written by Postgres triggers** — no application-layer bug can skip a log entry
2. **Append-only** — no UPDATE or DELETE RLS policy; immutable by construction
3. **Stores diffs, not full rows** — only changed fields in `old_value`/`new_value`
4. **Source-aware** — `source` field correctly reflects whether the write came from portal, ClickUp webhook, or system
5. **No-op guard** — trigger only fires when data actually changes
6. **Partitioned by month** — queries on recent data stay fast; old partitions archived to S3

### Audit Trigger

```sql
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id   uuid;
  v_source     text;
  v_old_diff   jsonb := '{}';
  v_new_diff   jsonb := '{}';
  v_key        text;
BEGIN
  -- Determine source from session variable (set by webhook Edge Fn)
  v_source := COALESCE(NULLIF(current_setting('app.update_source', true), ''), 'portal');

  -- For portal writes: actor is the authenticated user
  -- For clickup/system writes: actor_id is NULL (expected; FK is nullable)
  v_actor_id := CASE WHEN v_source = 'portal' THEN auth.uid() ELSE NULL END;

  -- No-op guard: skip if nothing actually changed (UPDATE only)
  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) = to_jsonb(OLD) THEN
    RETURN NEW;
  END IF;

  -- Build diff: only fields that changed (reduces storage significantly)
  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT key FROM jsonb_each(to_jsonb(OLD)) LOOP
      IF (to_jsonb(OLD) -> v_key) IS DISTINCT FROM (to_jsonb(NEW) -> v_key) THEN
        v_old_diff := v_old_diff || jsonb_build_object(v_key, to_jsonb(OLD) -> v_key);
        v_new_diff := v_new_diff || jsonb_build_object(v_key, to_jsonb(NEW) -> v_key);
      END IF;
    END LOOP;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_diff := to_jsonb(NEW);
  ELSE -- DELETE
    v_old_diff := to_jsonb(OLD);
  END IF;

  INSERT INTO audit_logs (
    actor_id, actor_role, action,
    resource_type, resource_id, resource_label,
    old_value, new_value, source
  ) VALUES (
    v_actor_id,
    (SELECT role FROM profiles WHERE id = v_actor_id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'
      WHEN 'DELETE' THEN 'deleted'
    END,
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id)::text,
    CASE TG_ARGV[0]
      WHEN 'task'    THEN COALESCE(NEW.title,   OLD.title)
      WHEN 'project' THEN COALESCE(NEW.name,    OLD.name)
      WHEN 'comment' THEN LEFT(COALESCE(NEW.content, OLD.content), 80)
      ELSE NULL
    END,
    NULLIF(v_old_diff, '{}'),
    NULLIF(v_new_diff, '{}'),
    v_source
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to tables. The WHEN clause skips triggers on rows that haven't changed.
CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('task');

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('project');

CREATE TRIGGER audit_comments
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('comment');

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION fn_audit_log('profile');

CREATE TRIGGER audit_reward_redemptions
  AFTER INSERT OR UPDATE ON reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log('reward_redemption');
```

### Semantic Action RPC (for events triggers can't infer)

```sql
CREATE OR REPLACE FUNCTION log_action(
  p_action        text,
  p_resource_type text,
  p_resource_id   text,
  p_resource_label text  DEFAULT NULL,
  p_old_value     jsonb  DEFAULT NULL,
  p_new_value     jsonb  DEFAULT NULL,
  p_source        text   DEFAULT 'portal',
  p_metadata      jsonb  DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, actor_role, action, resource_type, resource_id,
                          resource_label, old_value, new_value, source, metadata)
  VALUES (
    CASE WHEN p_source = 'portal' THEN auth.uid() ELSE NULL END,
    (SELECT role FROM profiles WHERE id = auth.uid()),
    p_action, p_resource_type, p_resource_id,
    p_resource_label, p_old_value, p_new_value, p_source, p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

Use for: login/logout, sync success/failure, settings changes, XP grants, bootstrap sync events.

### Monthly Partition Management

A monthly cron (pg_cron or Supabase scheduled function) creates the next partition before the month ends:

```sql
-- Run on the 25th of each month
CREATE TABLE IF NOT EXISTS audit_logs_YYYY_MM PARTITION OF audit_logs
  FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY+1-MM+1-01');
```

Old partitions (> 12 months) can be detached and exported to S3 via `pg_dump` of the single partition table, then dropped — without touching the parent table or any other data.

---

## 8. Supabase Edge Functions

### `clickup-webhook`
Receives inbound webhooks from ClickUp.
1. Verify HMAC-SHA256 signature using secret fetched from Vault — return `401` on failure (not `200`; letting ClickUp retry is preferable to silently accepting forged payloads)
2. Check idempotency: if this webhook event ID was already processed (store last N event IDs in a small dedup table), return `200` immediately
3. Open a DB transaction; `SET LOCAL app.update_source = 'clickup'`
4. Route by event type:
   - `taskCreated / taskUpdated / taskStatusUpdated / ...` → upsert `tasks` (timestamp-gated)
   - `taskDeleted` → soft-delete: `UPDATE tasks SET deleted_at = now() WHERE clickup_task_id = ...`
   - `taskCommentPosted / taskCommentUpdated` → upsert `comments`
   - `taskMoved` → update `tasks.project_id` by looking up new List's `clickup_list_id`
   - `taskAssigneeUpdated` → sync `task_assignees` (map ClickUp user IDs via `clickup_user_id` on profiles; drop unmatched silently and log warning)
5. Commit transaction; return `200`

### `clickup-sync-worker`
Processes outbound queue. Runs every **30 seconds** (not 10s — avoids burning free-tier invocations).

```
1. SELECT id, operation, resource_type, payload, depends_on, attempts
   FROM clickup_sync_queue
   WHERE status = 'pending'
     AND next_attempt_at <= now()
     AND (depends_on IS NULL OR EXISTS (
           SELECT 1 FROM clickup_sync_queue
           WHERE id = depends_on AND status = 'done'
         ))
   ORDER BY created_at
   LIMIT 10
   FOR UPDATE SKIP LOCKED;   -- safe for concurrent invocations

2. Mark each row: status = 'processing'

3. For each row:
   a. Fetch ClickUp API token from Vault
   b. Map portal status → ClickUp status via clickup_status_mappings
   c. Call ClickUp REST API
   d. On success:
        UPDATE clickup_sync_queue SET status = 'done', clickup_id = response.id
        UPDATE tasks/comments SET sync_state = 'synced', clickup_task_id = response.id
   e. On failure:
        attempts++
        next_attempt_at = now() + (2 ^ attempts) * interval '1 second'
        If attempts >= max_attempts:
          status = 'failed', sync_state = 'error'
          Cascade: mark all depends_on dependents as 'failed'
          INSERT INTO notifications (profile_id = task.created_by, ...)
```

### `file-proxy`
Serves attachment files via proxy — links posted to ClickUp never expire.

```
GET /functions/v1/file-proxy/:attachmentId

1. Verify JWT from Authorization header (or cookie)
   → If missing/invalid: redirect to portal login page
2. Fetch attachment row WHERE id = attachmentId
3. Check RLS manually:
   - Internal user: must be project_member of the task's project
   - Client user: must be client_member AND attachment.client_visible = true
   → If unauthorized: return 403
4. Generate a short-lived signed URL (60 seconds) from Supabase Storage
5. Return 302 redirect to the signed URL
```

The URL format posted to ClickUp comments:
`https://<project>.supabase.co/functions/v1/file-proxy/<attachment_uuid>`

This URL is permanent. The signed URL it redirects to is ephemeral (60s), generated fresh on every click.

### `discord-audit-post`
Called by `pg_net` HTTP extension from inside the `log_action` RPC, or from the audit trigger for high-priority actions.

1. Check `integrations.discord_audit_enabled` — skip if false
2. Check `integrations.discord_audit_filter` — skip if action not in filter
3. Fetch webhook URL from Vault using `integrations.discord_webhook_secret_id`
4. Format and POST Discord embed
5. Log result: on failure, insert into `audit_logs` with `action = 'system'`, `source = 'system'`

### `quest-evaluator`
Runs on a daily schedule for streak-based quests. Count-based quests are handled by Postgres triggers on `tasks` and `comments`.

```
Trigger-based (count quests):
  AFTER UPDATE OF status ON tasks
  WHEN NEW.status = 'completed' AND OLD.status != 'completed':
    → Update quest_progress for 'tasks_completed' quests for each assignee
    → If progress >= condition_value.count: mark completed, grant XP

Scheduled daily (streak quests):
  quest-evaluator Edge Function:
    For each active streak quest:
      For each employee:
        Count tasks completed on time in the last N days
        Update quest_progress.progress
        If streak met: mark completed, grant XP, notify user
```

---

## 9. Sync Queue & Conflict Resolution

### Timestamp-gated Upsert

ClickUp webhooks may arrive out of order due to network delays. Only apply incoming data if it is newer than what is already stored:

```sql
INSERT INTO tasks (clickup_task_id, title, status, updated_at, ...)
VALUES (...)
ON CONFLICT (clickup_task_id) DO UPDATE SET
  title      = EXCLUDED.title,
  status     = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at
WHERE tasks.updated_at < EXCLUDED.updated_at;  -- reject stale webhooks
```

If the WHERE clause prevents the update (stale data), the INSERT returns 0 rows affected. The Edge Function detects this and returns `200` without creating a sync queue entry — the local data is already newer.

### Idempotency

The sync worker checks `clickup_task_id IS NOT NULL` before issuing a create call. ClickUp's `custom_id` field stores our internal UUID so reverse-lookup from webhook payloads is unambiguous even if our DB row doesn't yet have the `clickup_task_id` populated.

### Webhook Deduplication

ClickUp may deliver the same webhook event more than once (retries on slow responses). A small dedup table prevents double-processing:

```sql
CREATE TABLE clickup_webhook_events (
  event_id    text PRIMARY KEY,  -- from webhook payload's unique ID
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Nightly cleanup: delete events older than 24 hours
DELETE FROM clickup_webhook_events WHERE received_at < now() - interval '24 hours';
```

---

## 10. Row Level Security Policies

### Helper Functions

```sql
CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_internal() RETURNS boolean AS $$
  SELECT role NOT IN ('client_owner', 'client_member')
  FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Check if current user is a member of a given project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND profile_id = auth.uid()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

Note: all helper functions use `SECURITY DEFINER SET search_path = public` to prevent search_path injection.

### Profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users see their own profile always
CREATE POLICY p_profiles_own ON profiles FOR SELECT
  USING (id = auth.uid());

-- Internal users see all other internal profiles (for assignee dropdowns, etc.)
CREATE POLICY p_profiles_internal ON profiles FOR SELECT
  USING (is_internal() AND role NOT IN ('client_owner', 'client_member'));

-- Client users see profiles of members in their own client org
CREATE POLICY p_profiles_client_members ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_members cm1
      JOIN client_members cm2 ON cm1.client_id = cm2.client_id
      WHERE cm1.profile_id = auth.uid() AND cm2.profile_id = profiles.id
    )
  );

-- Users update only their own non-role fields
CREATE POLICY p_profiles_self_update ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admin+ can update any profile (including role changes)
CREATE POLICY p_profiles_admin_update ON profiles FOR UPDATE
  USING (current_user_role() IN ('super_admin', 'admin'));
```

### Projects

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Internal: only see projects they are a member of (not ALL projects)
CREATE POLICY p_projects_member_select ON projects FOR SELECT
  USING (
    is_internal() AND
    deleted_at IS NULL AND
    is_project_member(id)
  );

-- Admin/PM see all non-deleted projects regardless of membership (for management views)
CREATE POLICY p_projects_admin_select ON projects FOR SELECT
  USING (
    current_user_role() IN ('super_admin', 'admin', 'project_manager') AND
    deleted_at IS NULL
  );

-- Admin sees soft-deleted projects (Trash view)
CREATE POLICY p_projects_trash_select ON projects FOR SELECT
  USING (
    current_user_role() IN ('super_admin', 'admin') AND
    deleted_at IS NOT NULL
  );

-- Client: only client_visible projects for their client
CREATE POLICY p_projects_client_select ON projects FOR SELECT
  USING (
    client_visible AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM client_members
      WHERE client_id = projects.client_id AND profile_id = auth.uid()
    )
  );

-- Create/update: admin and PM only
CREATE POLICY p_projects_insert ON projects FOR INSERT
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

CREATE POLICY p_projects_update ON projects FOR UPDATE
  USING (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- Hard DELETE is disallowed; use soft-delete (set deleted_at) instead
-- No DELETE policy defined = DELETE is blocked for all roles
```

### Tasks

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Internal project members see non-deleted tasks
CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal() AND
    deleted_at IS NULL AND
    is_project_member(project_id)
  );

-- Admin sees soft-deleted tasks (Trash view)
CREATE POLICY p_tasks_trash_select ON tasks FOR SELECT
  USING (
    current_user_role() IN ('super_admin', 'admin') AND
    deleted_at IS NOT NULL
  );

-- Clients: client_visible tasks only
CREATE POLICY p_tasks_client_select ON tasks FOR SELECT
  USING (
    client_visible AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      JOIN client_members cm ON cm.client_id = p.client_id
      WHERE p.id = tasks.project_id AND cm.profile_id = auth.uid()
    )
  );

-- Any project member can create tasks
CREATE POLICY p_tasks_insert ON tasks FOR INSERT
  WITH CHECK (
    is_internal() AND is_project_member(project_id)
  );

-- Assignees, team leads, PMs, admins can update tasks
CREATE POLICY p_tasks_update ON tasks FOR UPDATE
  USING (
    is_internal() AND
    deleted_at IS NULL AND
    (
      is_project_member(project_id) AND
      current_user_role() IN ('super_admin','admin','project_manager','team_lead')
      OR
      EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND profile_id = auth.uid())
    )
  );

-- No hard DELETE; soft-delete only via UPDATE (setting deleted_at)
```

### Comments

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_comments_internal_select ON comments FOR SELECT
  USING (
    is_internal() AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = comments.task_id AND is_project_member(t.project_id)
    )
  );

CREATE POLICY p_comments_client_select ON comments FOR SELECT
  USING (
    client_visible AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN client_members cm ON cm.client_id = p.client_id
      WHERE t.id = comments.task_id AND cm.profile_id = auth.uid()
    )
  );

-- Any project member or visible client can add comments
CREATE POLICY p_comments_insert ON comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND (
      is_internal() OR  -- client portal comment (client_visible enforced at app level)
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON p.id = t.project_id
        JOIN client_members cm ON cm.client_id = p.client_id
        WHERE t.id = comments.task_id AND cm.profile_id = auth.uid()
          AND t.client_visible = true
      )
    )
  );

-- Authors can edit their own comments; admins can edit any
CREATE POLICY p_comments_update ON comments FOR UPDATE
  USING (
    author_id = auth.uid() OR
    current_user_role() IN ('super_admin', 'admin')
  );

-- Authors can delete their own comments; admins can delete any
CREATE POLICY p_comments_delete ON comments FOR DELETE
  USING (
    author_id = auth.uid() OR
    current_user_role() IN ('super_admin', 'admin')
  );
```

### Attachments

```sql
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_attachments_internal_select ON attachments FOR SELECT
  USING (
    is_internal() AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = attachments.task_id AND is_project_member(t.project_id)
    )
  );

CREATE POLICY p_attachments_client_select ON attachments FOR SELECT
  USING (
    client_visible AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN client_members cm ON cm.client_id = p.client_id
      WHERE t.id = attachments.task_id AND cm.profile_id = auth.uid()
    )
  );

CREATE POLICY p_attachments_insert ON attachments FOR INSERT
  WITH CHECK (uploader_id = auth.uid() AND is_internal());

CREATE POLICY p_attachments_delete ON attachments FOR DELETE
  USING (
    uploader_id = auth.uid() OR
    current_user_role() IN ('super_admin', 'admin')
  );
```

### Checklists & Checklist Items

```sql
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_checklists_select ON checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = checklists.task_id AND is_project_member(t.project_id)
    )
  );

CREATE POLICY p_checklists_write ON checklists FOR ALL
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY p_checklist_items_select ON checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      JOIN tasks t ON t.id = c.task_id
      WHERE c.id = checklist_items.checklist_id AND is_project_member(t.project_id)
    )
  );

CREATE POLICY p_checklist_items_write ON checklist_items FOR ALL
  USING (is_internal())
  WITH CHECK (is_internal());
```

### Notifications

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY p_notifications_select ON notifications FOR SELECT
  USING (profile_id = auth.uid());

-- Users can mark their own as read
CREATE POLICY p_notifications_update ON notifications FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- No INSERT policy: notifications are inserted only by SECURITY DEFINER functions
-- No DELETE policy: cleanup is handled by scheduled cron, not users
```

### XP & Rewards

```sql
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_xp_own_select ON xp_transactions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_xp_admin_select ON xp_transactions FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

-- No INSERT/UPDATE/DELETE: only via SECURITY DEFINER functions (fn_apply_xp_transaction, redeem_reward)

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_rewards_select ON rewards FOR SELECT
  USING (auth.uid() IS NOT NULL);  -- any authenticated user

CREATE POLICY p_rewards_write ON rewards FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_redemptions_own ON reward_redemptions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_redemptions_admin ON reward_redemptions FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY p_redemptions_insert ON reward_redemptions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY p_redemptions_admin_update ON reward_redemptions FOR UPDATE
  USING (current_user_role() IN ('super_admin', 'admin'));
```

### Quests

```sql
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_quests_select ON quests FOR SELECT
  USING (is_internal() AND is_active = true);

CREATE POLICY p_quests_admin_write ON quests FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY p_quest_progress_own ON quest_progress FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_quest_progress_admin ON quest_progress FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

-- No INSERT/UPDATE: managed exclusively by SECURITY DEFINER trigger functions
```

### Audit Logs

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Append-only enforced by absence of UPDATE and DELETE policies
-- INSERT is only possible via SECURITY DEFINER trigger functions (bypasses RLS)
CREATE POLICY p_audit_select ON audit_logs FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));
```

### Integrations

```sql
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_integrations_select ON integrations FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY p_integrations_write ON integrations FOR ALL
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');
```

### ClickUp Status Mappings

```sql
ALTER TABLE clickup_status_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_status_mappings_select ON clickup_status_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);  -- sync worker and portal both need to read

CREATE POLICY p_status_mappings_write ON clickup_status_mappings FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));
```

---

## 11. SaaS Scalability

### Multi-tenancy Pattern: workspace_id from Day One

Add `workspace_id uuid NOT NULL DEFAULT '<linknbit-uuid>'` to every major table. RLS is not enforced on it for the current single-tenant deployment. When selling as SaaS:

1. Remove the `DEFAULT` clause — workspace_id becomes required
2. Add `workspace_id` check to every RLS policy (one line per policy)
3. Convert `integrations` from a singleton to one-row-per-workspace
4. Add a `workspaces` table + Stripe billing flow
5. Point subdomains (`acme.portal.io`) to the same Supabase instance

This requires no schema migration — just policy updates and adding the `workspaces` table.

### ClickUp OAuth for SaaS

Current single-tenant: one personal API token stored in Vault.

For SaaS, each workspace needs its own ClickUp OAuth token:
- Add `clickup_oauth_token_secret_id` and `clickup_refresh_token_secret_id` to `integrations`
- Add a token refresh job: before each sync worker run, check token expiry and refresh if needed via ClickUp's OAuth refresh endpoint
- Store token expiry timestamp in `integrations.clickup_token_expires_at`

### Supabase Vault Usage

Every secret is stored in Vault. Table columns hold only Vault secret IDs.

| Secret | Column |
|--------|--------|
| ClickUp API token | `clickup_api_token_secret_id` |
| ClickUp webhook HMAC secret | `clickup_webhook_secret_id` |
| Discord webhook URL | `discord_webhook_secret_id` |

Edge Functions read secrets via `vault.decrypted_secrets`. No secret ever appears in a plain SQL query result.

### Security Checklist

- [ ] All `SECURITY DEFINER` functions include `SET search_path = public`
- [ ] Webhook HMAC verified before any DB write; return `401` on failure
- [ ] `audit_logs`: no UPDATE or DELETE policy defined — verified at deploy time
- [ ] `integrations`: accessible only to `super_admin`
- [ ] Supabase Storage buckets: `task-attachments` and `project-files` are **private** (no public access); all access via `file-proxy`
- [ ] Supabase Storage bucket: `avatars` is public (profile pictures)
- [ ] ClickUp webhook dedup table cleared nightly
- [ ] Sync worker uses `FOR UPDATE SKIP LOCKED` — verified in code review

---

## Summary

```
Supabase PostgreSQL     → source of truth; all writes land here first
ClickUp                 → bidirectional sync via queue (outbound, FOR UPDATE SKIP LOCKED)
                          and webhooks (inbound, session-variable echo prevention)
Discord                 → optional audit log posts via webhook URL in Settings; nothing else
Supabase Realtime       → postgres_changes for comments/notifications;
                          Broadcast channels for high-frequency task board updates
Supabase Storage        → all files; served via file-proxy Edge Fn (links never expire)
Postgres Triggers       → audit logs (diff-only, source-aware, no-op guarded, partitioned)
                          XP sync, level recalc, quest progress (count-based)
RBAC                    → user_role enum + Supabase RLS on all 15+ tables
                          internal users scoped to project membership, not all projects
Gamification            → XP via immutable ledger + trigger cache; levels via threshold table;
                          quests via trigger (count) + scheduled Edge Fn (streak)
Secrets                 → Supabase Vault for all credentials; table stores only secret IDs
Multi-tenancy           → workspace_id column present from day one; enforced at SaaS launch
```
