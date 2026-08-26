-- The internal Dashboard screen is gone (it was a grid of links to sidebar items
-- that are always on screen) and Inbox is now Notifications. Pins are stored as
-- a label + path pair, so rows created before this release would keep pointing at
-- a route that only redirects, under a name nobody sees in the sidebar any more.
--
-- Data-only; the routes still redirect, so this is safe to run before or after the
-- front end deploys.

-- Dashboard has no replacement screen. /dashboard redirects to /my-day, which
-- is a nav item in its own right, so repointing would leave duplicate pins.
delete from public.nav_pins where path = '/dashboard';

update public.nav_pins
   set path  = '/notifications',
       label = case when label = 'Inbox' then 'Notifications' else label end
 where path = '/inbox'
   -- Somebody who already pinned Notifications keeps that one pin.
   and not exists (
     select 1 from public.nav_pins existing
      where existing.profile_id = nav_pins.profile_id
        and existing.path = '/notifications'
   );

delete from public.nav_pins where path = '/inbox';
