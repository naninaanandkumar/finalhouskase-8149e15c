REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) TO service_role;