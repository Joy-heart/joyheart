-- Deprecated safety guard. The previous version dropped the private-settings RPC
-- and was not a conventional rollback. Use round-5a1-secure-profile-permission-recovery.sql.
-- Function removal requires a separately approved operation after app compatibility.
do $blocked$
begin
 raise exception 'UNSAFE_LEGACY_ROLLBACK_DISABLED: use round-5a1-secure-profile-permission-recovery.sql; RPC preserved';
end
$blocked$;
