create or replace function public.review_report(report_id uuid,decision text) returns void language plpgsql security definer set search_path='' as $function$
begin
 if not public.is_wayss_admin() then raise exception 'Only the WAYSS admin can review reports'; end if;
 if decision not in ('reviewing','resolved','dismissed') then raise exception 'Invalid report decision'; end if;
 update public.reports set status=decision where id=report_id and status in ('open','reviewing');
 if not found then raise exception 'Open report not found'; end if;
end;$function$;
revoke all on function public.review_report(uuid,text) from public,anon;
grant execute on function public.review_report(uuid,text) to authenticated;
