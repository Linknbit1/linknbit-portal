# Permission Model v2 — Phase 1 Design

Status: **proposed, not implemented**
Date: 2026-07-28
Supersedes: the `role_feature_flags` design (still live)

---

## 1. The problem, measured

Permissions are attached to a role, and a profile has exactly one role
(`profiles.role`, a plain `text` column). There is no way to express
"this person, plus one capability" — the only lever is promotion to a role
that carries every capability at once.

Current state of the live database:

| | Count |
|---|---|
| RLS policies | 172 |
| …gated by `current_user_role()` (hardcoded role) | 57 |
| …gated by `has_feature()` (flag-driven) | 34 |
| …gated by ownership or membership | ~81 |
| DB functions hardcoding a role name | 21 |
| Frontend hardcoded role comparisons | 29 across 13 files |
| Frontend `*_ROLES` constant arrays | 9 |

Consequences visible today:

- 4 of 21 accounts are `admin`, because `admin` is the only way to grant
  project authority to someone who is not a manager.
- `can_view_confidential` is enabled for `admin`, `project_manager` **and**
  `team_lead` — so 8 of 21 accounts can read every confidential document.
- `super_admin` and `finance` are fully configured but have zero accounts.

## 2. Goals and non-goals

**Phase 1 goals**

- Roles become data: created, renamed, and deleted by an administrator.
- A person holds **many** roles, not one.
- Permissions are the **union** of the person's roles.
- Role hierarchy prevents privilege escalation.
- Day one behaviour is **bit-for-bit identical** to today, and that is proved,
  not assumed.

**Explicit non-goals for Phase 1**

- Do *not* touch the 57 role-based policies. They keep calling
  `current_user_role()` and keep working.
- Do *not* add per-project or per-scope permissions (Phase 3).
- Do *not* add deny rules (see §9, open decision).
- Do *not* drop `profiles.role`. It stays as the display/primary role.
- Do *not* touch ownership or membership policies. "I can see my own
  attendance" is not a permission and must never become one.

The three concepts stay separate:

| Concept | Question | Where it lives | Phase 1 changes it? |
|---|---|---|---|
| Ownership | Is this mine? | `profile_id = auth.uid()` | No |
| Membership | Am I on this project/team? | `is_project_member()` etc. | No |
| Permission | Am I allowed to do this? | `has_feature()` | **Yes** |

## 3. Model

Mapped from Discord, keeping the parts that fit an org of this size.

| Discord | Here | Phase |
|---|---|---|
| Roles are user-created data | `roles` table | 1 |
| A member has many roles | `profile_roles` | 1 |
| Permissions union across roles | resolution in `has_feature()` | 1 |
| `ADMINISTRATOR` bypasses everything | `administrator` permission key | 1 |
| Role position / hierarchy | `roles.position` | 1 |
| Per-channel overwrites | per-scope grants | 3 |

Discord's permission **bitfield** is deliberately not copied. It exists for
compactness at millions-of-servers scale, and Discord has already run out of
bits. Text keys in a table are the right call here.

## 4. Schema

```sql
-- The catalog of what can be permitted. Seeded from the current 17 keys.
create table permissions (
  key         text primary key,
  label       text not null,
  description text,
  category    text not null,          -- groups the admin UI
  sort_order  int  not null default 0
);

-- Roles are data. System roles cannot be deleted.
create table roles (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,   -- 'admin', 'portal-developer'
  name        text not null,          -- display name
  color       text,                   -- badge colour, Discord-style
  position    int  not null,          -- hierarchy; higher = more powerful
  is_system   boolean not null default false,  -- undeletable
  is_default  boolean not null default false,  -- auto-granted to new profiles
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index roles_one_default on roles (is_default) where is_default;

-- Presence = granted. There is no `enabled` column: absence means not granted.
-- (This differs from role_feature_flags, which stored explicit false rows.)
create table role_permissions (
  role_id        uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- A profile holds many roles.
create table profile_roles (
  profile_id uuid not null references profiles(id) on delete cascade,
  role_id    uuid not null references roles(id)    on delete cascade,
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role_id)
);

create index profile_roles_profile_idx  on profile_roles (profile_id);
create index role_permissions_role_idx  on role_permissions (role_id, permission_key);
```

## 5. Resolution

Phase 1 is purely additive — a person's permissions are the union over their
roles. No denies, no ordering, no precedence to reason about.

```
effective(user) = ⋃ { role_permissions[r] : r ∈ profile_roles[user] }

allowed(user, key) = key ∈ effective(user)
                     OR 'administrator' ∈ effective(user)
```

`administrator` replaces the current hardcoded `super_admin` short-circuit with
a permission that is visible and editable in the UI like any other.

### The `has_feature()` rewrite

This is the entire integration point. The signature does not change, so all 34
policies and 16 functions that call it switch over untouched.

```sql
create or replace function has_feature(p_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from profile_roles pr
    join role_permissions rp on rp.role_id = pr.role_id
    where pr.profile_id = auth.uid()
      and rp.permission_key in (p_key, 'administrator')
  );
$$;
```

**Performance.** Postgres does not memoise `STABLE` functions across rows, so
in a policy this runs per row. At current size — 21 profiles, ~8 roles, ~150
`role_permissions` rows — both sides are index-only scans and the cost is
negligible. If it ever shows up in a query plan, the escape hatch is a
`profile_effective_permissions` table maintained by triggers on
`profile_roles` and `role_permissions`. Do not pre-optimise this.

## 6. Seeding: identical behaviour on day one

The migration must leave every existing user with exactly the permissions they
have now.

1. Insert the 17 current keys into `permissions`, plus `administrator`.
2. Create one **system role** per existing role value, with positions spaced by
   10 so custom roles can slot between:

   | Slug | Position |
   |---|---|
   | `super_admin` | 100 |
   | `admin` | 90 |
   | `hr` | 70 |
   | `project_manager` | 60 |
   | `team_lead` | 50 |
   | `finance` | 40 |
   | `employee` | 10 (`is_default`) |

3. For each `role_feature_flags` row with `enabled = true`, insert the matching
   `role_permissions` row. Rows with `enabled = false` are simply not inserted.
4. Grant `administrator` to the `super_admin` role, reproducing its
   short-circuit.
5. For every profile, insert one `profile_roles` row matching its current
   `profiles.role`.

### Acceptance test — this gates the migration

For all 21 profiles × 17 permissions (357 pairs), the old answer and the new
answer must agree. Zero rows returned, or the migration does not ship.

```sql
with keys as (select distinct feature_key from role_feature_flags),
old as (
  select p.id as profile_id, k.feature_key,
         (p.role = 'super_admin') or coalesce(f.enabled, false) as allowed
  from profiles p
  cross join keys k
  left join role_feature_flags f
         on f.role = p.role and f.feature_key = k.feature_key
),
new as (
  select p.id as profile_id, k.feature_key,
         exists (
           select 1 from profile_roles pr
           join role_permissions rp on rp.role_id = pr.role_id
           where pr.profile_id = p.id
             and rp.permission_key in (k.feature_key, 'administrator')
         ) as allowed
  from profiles p cross join keys k
)
select old.profile_id, old.feature_key, old.allowed, new.allowed
from old join new using (profile_id, feature_key)
where old.allowed is distinct from new.allowed;
```

`role_feature_flags` is **kept, not dropped**, until Phase 2 completes — it is
the reference for this test and the rollback path.

## 7. Hierarchy and escalation guards

`roles.position` replaces the hardcoded `can_manage_target()` /
`can_grant_role()` CASE ladder. Let `top(user) = max(position)` over the user's
roles. Enforced in triggers, not just the UI:

1. You may only assign or revoke a role whose `position < top(you)`.
2. You may only edit or delete a role whose `position < top(you)`.
3. You may not grant a permission you do not hold yourself.
4. `administrator` bypasses 1–3.
5. `is_system` roles cannot be deleted, and the `is_default` role cannot be
   deleted at all.

Rule 3 is what makes custom roles safe to delegate. Without it, anyone who can
create a role can grant themselves anything.

**Lockout guard.** *(Adjusted during implementation.)* The invariant was
specified as "at least one profile must hold `administrator`", but zero
accounts hold it — there are no super_admin accounts — so that would have been
unsatisfiable on day one. It is anchored on `can_manage_roles` instead, which
the four admins do hold: `fn_assert_role_admin_exists()`, a deferred constraint
trigger on both `profile_roles` and `role_permissions`.

## 8. Frontend impact

The hook API in `src/hooks/useRoleFlags.ts` is already the right shape and
stays as-is — `useCanAccess`, `useFeatureAccess`, and the named `useCanX()`
hooks keep identical signatures. Only internals change:

- New `src/api/permissions.ts` + `src/hooks/usePermissions.ts` fetching the
  signed-in user's effective permission set (one array, not the 119-row matrix).
- `useFeatureAccess` becomes a set membership check. The `isLoading` contract is
  unchanged — **guards must spinner, never redirect, while loading**.
- Drop the `profile?.role === 'super_admin'` short-circuit in favour of
  `administrator` in the permission set.
- `useCanFulfillPayouts` currently hardcodes `profile?.role === 'finance'`.
  It becomes a real permission key, `can_fulfill_payouts`.
- Settings → Permissions grows from a role × flag grid into a role manager:
  role list with drag-to-reorder, per-role permission grid, and member
  assignment. A "view as role" simulator is worth building early — it is how
  you will debug every future permission question.

The 29 hardcoded role comparisons and 9 `*_ROLES` arrays are **out of scope**
for Phase 1 and stay exactly as they are.

## 9. Open decisions

1. **Additive only, or denies?** Recommendation: **additive only**. Denies make
   "why can't this person do X" a real debugging exercise. Reserve them for
   Phase 3 scoped grants, where they earn their cost.
2. **Keep `profiles.role`?** Recommendation: keep it in Phase 1 as the primary
   role for display and filtering, and reconsider at the end of Phase 2 when
   nothing reads it for authorization.
3. **Multi-role display.** A person with three roles needs a badge treatment.
   Discord shows the highest-positioned role's colour. Same approach here.
4. **Default role for new profiles.** Assumed `employee`. Confirm.
5. **Is `finance` worth keeping** as a system role given it has zero accounts,
   or should it become a custom role once someone actually needs it?

## 10. Phase 2: complete

**57 role-based policies → 1.** The survivor is
`profiles.p_profiles_self_update`, whose `role = current_user_role()` is a
self-escalation guard, not a capability check. It stays.

Delivered in four migrations:

| Migration | What |
|---|---|
| `20260728180000` | 13 policies whose role set matched an existing key exactly |
| `20260728190000` | 12 new keys, each seeded to the exact role set its policies named |
| `20260728200000` | the remaining 43 policies |
| `20260728210000` | **fix** for a regression introduced by the previous one |

Final state: 38 permission keys, 105 grants, 87 flag-driven policies. The RLS
golden baseline shows **zero change** on every pre-existing check.

### The regression, and the lesson

Batch 2b rewrote policies by regex-substituting the `current_user_role() = ANY
(ARRAY[...])` sub-expression. Four policies contained **two different** role
expressions — an unconditional branch for one role set, plus a narrower branch
gated by a scoping predicate:

```sql
-- standups.p_standups_select, as it was
profile_id = auth.uid()
OR current_user_role() = ANY (ARRAY['super_admin','admin','hr'])
OR (current_user_role() = ANY (ARRAY['team_lead','project_manager'])
    AND shares_team_with(profile_id))
```

A global substitution collapsed both branches to the same key, so team leads
and PMs matched the *unconditional* branch and could read every standup
company-wide. The same shape in `projects`/`tasks` gave PMs visibility of
soft-deleted rows.

Two things caught and fixed it: the golden baseline flagged 5 changed
decisions, and the pre-migration `pg_dump` still held the original definitions
to rebuild from. Migration `20260728210000` splits each branch onto its own key
(`can_view_all_standups` vs `can_view_team_standups`,
`can_view_all_projects` vs `can_view_deleted_projects`).

**If you convert more policies later:** never substitute globally across a
policy body without first checking whether it names more than one role set, and
make sure the affected table is in the probe list in
`supabase/tests/rls/snapshot.sql`. `standups` was missing from that list, which
is why one of the four regressions was invisible to the harness.

### Historical: the decisions this needed

Kept for reference — these are the clusters and the keys minted for each.

| Roles named | Count | Where | Nearest existing key | Drift if reused | Suggested |
|---|---|---|---|---|---|
| `super_admin, admin, project_manager` | 12 | stages, tasks, attachments, approvals, mentions, project_watchers writes | `can_manage_projects` | **team_lead gains** delivery write access | new `can_edit_delivery` |
| `super_admin, admin` | 11 | comments moderation, services, clients read, leave/wfh/ot/exception deletes, profiles admin update, job_type_policies, redemption updates | varies | `can_manage_attendance` would **give HR delete rights** | new `can_delete_attendance_records`, `can_manage_services`, `can_moderate_comments` |
| `super_admin, admin, project_manager, finance` | 6 | internal SELECT on projects, tasks, stages, attachments, approvals, mentions | none | — | new `can_view_all_projects` |
| `project_manager, team_lead` | 4 | team-scoped leave / wfh / overtime / exceptions | none | — | new `can_view_team_attendance` |
| `super_admin, admin, hr` | 3 | employee_salaries select/insert/update | `can_manage_people` | semantically wrong — salary is not profile editing | new `can_view_salaries` |
| `super_admin, admin, hr, pm, team_lead` | 2 | standups select | none | — | new `can_view_standups` |
| `finance` | 2 | monthly_lp_history, reward_redemptions | `can_fulfill_payouts` | **HR and admin gain** payout visibility | decide |
| `super_admin, admin, pm, team_lead` | 1 | attendance team scope | `can_manage_projects` (exact set!) | numerically identical, semantically wrong | new `can_view_team_attendance` |
| `super_admin` | 1 | levels write | `can_govern_gamification` | **admin and HR gain** level editing | decide |
| none | 1 | `profiles.p_profiles_self_update` | — | uses `current_user_role()` without a role literal (self-escalation guard) | leave as-is |

Note `enrolled_devices.p_enrolled_devices_admin_write` was partially converted:
it carried a second role expression in a different syntactic form, which the
substitution did not match. Finish it by hand.

The mechanical converter in migration `20260728180000` is reusable — add rows
to its mapping table once the keys above exist.

## 11. Sequence after this document

1. RLS test suite — before any policy changes
2. Phase 1 migration + acceptance test above
3. Custom role for the portal developer, replacing their `admin`
4. Confidential document scoping (Phase 3 pattern, done early — it is a live
   exposure, not a future concern)
5. Phase 2 — convert the 57 role-based policies, module by module
