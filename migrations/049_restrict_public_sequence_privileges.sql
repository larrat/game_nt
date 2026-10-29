-- Migration 049: remove direct client access to public-schema sequences.
-- All gameplay inserts and ID allocation now happen inside trusted SECURITY DEFINER RPCs;
-- anon/authenticated do not need USAGE/SELECT/UPDATE on serial/identity sequences.

REVOKE ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
