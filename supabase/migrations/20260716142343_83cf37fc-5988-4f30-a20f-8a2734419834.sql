CREATE OR REPLACE FUNCTION public.mcp_check_rate_limit(_user uuid, _tool text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  minute_count int;
  day_count int;
  tool_hour_count int;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT count(*) INTO minute_count
    FROM public.mcp_audit_log
    WHERE user_id = _user AND created_at > now() - interval '1 minute';
  IF minute_count >= 60 THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'Rate limit exceeded: max 60 MCP calls per minute. Please retry in a few seconds.');
  END IF;

  SELECT count(*) INTO day_count
    FROM public.mcp_audit_log
    WHERE user_id = _user AND created_at > now() - interval '1 day';
  IF day_count >= 2000 THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'Daily quota exceeded: max 2000 MCP calls per 24 hours.');
  END IF;

  SELECT count(*) INTO tool_hour_count
    FROM public.mcp_audit_log
    WHERE user_id = _user AND tool_name = _tool AND created_at > now() - interval '1 hour';

  IF _tool = 'initiate_checkout' AND tool_hour_count >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'Per-tool quota exceeded: max 10 checkouts per hour.');
  END IF;

  IF _tool = 'create_rfq' AND tool_hour_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'Per-tool quota exceeded: max 20 RFQ creations per hour.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) TO service_role;