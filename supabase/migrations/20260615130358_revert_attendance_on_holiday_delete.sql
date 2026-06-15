-- Applying a holiday runs trg_holiday_backfill (AFTER INSERT), flipping that date's
-- attendance rows from 'absent' to 'holiday'. There was no inverse on DELETE, so
-- removing a holiday left those rows stuck at 'holiday' and the dates stayed grayed
-- out in the daily records / reports view.
--
-- 1. Add the inverse trigger: on holiday delete, revert 'holiday' rows back to
--    'absent' for that date (unless another holiday still covers the same date).
-- 2. One-time cleanup of rows already orphaned by past deletions.

create or replace function public.fn_holiday_revert_attendance()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.holidays where date = old.date) then
    update public.attendance
    set    status     = 'absent',
           updated_at = now()
    where  date   = old.date
      and  status = 'holiday';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_holiday_revert on public.holidays;
create trigger trg_holiday_revert
  after delete on public.holidays
  for each row execute function public.fn_holiday_revert_attendance();

-- One-time cleanup of existing orphans (status='holiday' with no matching holiday row).
update public.attendance a
set    status     = 'absent',
       updated_at = now()
where  a.status = 'holiday'
  and  not exists (select 1 from public.holidays h where h.date = a.date);
