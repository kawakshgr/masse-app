-- Three functions the security advisor flagged for a role-mutable
-- search_path. None of them names an unqualified object — built-ins resolve
-- through pg_catalog whatever the path — so pinning it empty changes nothing
-- they do and removes the way to make them resolve something else.
alter function public.cycle_phase_spans(integer) set search_path = '';
alter function private.folder_client(text) set search_path = '';
alter function private.folder_coach(text) set search_path = '';
