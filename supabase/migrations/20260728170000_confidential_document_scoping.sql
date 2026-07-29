-- Confidential document scoping.
--
-- Until now `is_confidential` was a single global bit gated by one permission,
-- so anyone who could read a confidential project document would also be able
-- to read confidential HR documents the moment those exist. Eight of twenty-one
-- accounts held that permission.
--
-- Confidentiality now carries a DOMAIN. A person is granted the domains they
-- need, not "confidential" in the abstract.
--
--   project | delivery documents, client NDAs, contracts
--   hr      | employment contracts, ID documents, medical, disciplinary
--   finance | payroll, invoices, banking
--   legal   | legal correspondence
--
-- ACCESS IMPACT: none on existing data. attachments is empty, and every role
-- that could read confidential documents keeps the `project` domain. What
-- changes is that project_manager and team_lead no longer hold the blanket key,
-- so HR/finance/legal documents are walled off before any exist.

alter table attachments
  add column if not exists confidential_scope text not null default 'project';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'attachments_confidential_scope_check'
  ) then
    alter table attachments
      add constraint attachments_confidential_scope_check
      check (confidential_scope in ('project','hr','finance','legal'));
  end if;
end $$;

comment on column attachments.confidential_scope is
  'Which confidentiality domain this document belongs to. Only meaningful when is_confidential.';

-- ── Scoped permission keys ───────────────────────────────────────────────────
insert into permissions (key, label, category, sort_order, description) values
  ('can_view_confidential_project', 'Confidential: project files',  'Documents', 71, 'Open confidential delivery documents, client NDAs and contracts.'),
  ('can_view_confidential_hr',      'Confidential: HR files',       'Documents', 72, 'Open confidential employment, identity, medical and disciplinary documents.'),
  ('can_view_confidential_finance', 'Confidential: finance files',  'Documents', 73, 'Open confidential payroll, invoice and banking documents.'),
  ('can_view_confidential_legal',   'Confidential: legal files',    'Documents', 74, 'Open confidential legal correspondence.')
on conflict (key) do nothing;

update permissions
   set label = 'Confidential: all domains',
       description = 'Master key: open confidential documents in every domain. Prefer granting a specific domain.'
 where key = 'can_view_confidential';

-- Everyone who can read confidential documents today keeps the project domain.
insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_confidential_project'
from roles r
where exists (
  select 1 from role_permissions rp
  where rp.role_id = r.id and rp.permission_key = 'can_view_confidential'
)
on conflict do nothing;

-- HR gets the HR domain; finance gets the finance domain.
insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_confidential_hr' from roles r where r.slug in ('super_admin','admin','hr')
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_confidential_finance' from roles r where r.slug in ('super_admin','admin','finance')
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_confidential_legal' from roles r where r.slug in ('super_admin','admin')
on conflict do nothing;

-- The blanket key narrows to super_admin/admin. project_manager and team_lead
-- keep project-domain access through the scoped key granted above, so their
-- effective access to existing documents is unchanged.
delete from role_permissions rp
using roles r
where rp.role_id = r.id
  and rp.permission_key = 'can_view_confidential'
  and r.slug in ('project_manager','team_lead');

-- ── Resolution helper ────────────────────────────────────────────────────────
create or replace function public.can_view_confidential_scope(p_scope text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select has_feature('can_view_confidential')
      or has_feature('can_view_confidential_' || coalesce(p_scope, 'project'));
$function$;

comment on function public.can_view_confidential_scope(text) is
  'True when the caller may open confidential documents in the given domain, either via the master key or the domain-specific one.';

-- ── Policy ───────────────────────────────────────────────────────────────────
-- Unchanged except that the confidentiality test is now domain-aware. The
-- role-based portion still names roles directly and is converted in Phase 2.
drop policy if exists p_attachments_internal_select on attachments;
create policy p_attachments_internal_select on attachments
  for select to authenticated
  using (
    is_internal()
    and (
      current_user_role() = any (array['super_admin','admin','project_manager','finance'])
      or is_project_member(project_id)
    )
    and (
      not is_confidential
      or can_view_confidential_scope(confidential_scope)
    )
  );

-- ── Guard ────────────────────────────────────────────────────────────────────
-- Marking a document confidential, declassifying it, or moving it between
-- domains all require rights in the domain concerned - otherwise someone could
-- reclassify an HR document into the project domain to read it.
create or replace function public.fn_guard_attachment_confidential()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    if new.is_confidential and not can_view_confidential_scope(new.confidential_scope) then
      raise exception 'forbidden_confidential';
    end if;
  else
    if (new.is_confidential is distinct from old.is_confidential
        or new.confidential_scope is distinct from old.confidential_scope)
       and not (
         can_view_confidential_scope(old.confidential_scope)
         and can_view_confidential_scope(new.confidential_scope)
       ) then
      raise exception 'forbidden_confidential';
    end if;
  end if;
  return new;
end
$function$;
