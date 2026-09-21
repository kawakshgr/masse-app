-- admin_log_access is the audit writer used by the audited readers. Exposing it
-- on /rest/v1/rpc would let an admin write log entries that correspond to no
-- actual access, which weakens the trail the whole design rests on. Callers
-- inside SECURITY DEFINER functions are unaffected: they run as the owner.
revoke all on function public.admin_log_access(public.admin_action, text, uuid, uuid)
  from anon, authenticated, public;
