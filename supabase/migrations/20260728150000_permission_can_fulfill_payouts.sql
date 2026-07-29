-- Permission model v2, part 5: replace the frontend's hardcoded finance check.
--
-- `useCanFulfillPayouts` read `useCanGovernGamification() || role === 'finance'`.
-- That is a capability, not a hierarchy rule, so it becomes a real permission.
--
-- Seeded to exactly reproduce the old expression: every role that holds
-- can_govern_gamification (super_admin, admin, hr), plus finance.
--
-- The matching RLS policy (p_redemptions_admin on reward_redemptions) still
-- names roles directly and is converted in Phase 2.

insert into permissions (key, label, category, sort_order, description) values
  ('can_fulfill_payouts', 'Fulfil cash payouts', 'Governance', 5,
   'Mark cash reward redemptions as paid out.')
on conflict (key) do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, 'can_fulfill_payouts'
from roles r
where r.slug = 'finance'
   or exists (
     select 1 from role_permissions rp
     where rp.role_id = r.id and rp.permission_key = 'can_govern_gamification'
   )
on conflict do nothing;
