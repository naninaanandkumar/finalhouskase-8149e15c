CREATE OR REPLACE FUNCTION public.mcp_check_rate_limit(_user uuid, _tool text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  minute_count int;
  day_count int;
  tool_hour_count int;
  target uuid;
BEGIN
  -- A signed-in caller may only check their own usage; service_role (no JWT) may check anyone.
  target := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE _user END;

  IF target IS NULL THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT count(*) INTO minute_count
    FROM public.mcp_audit_log
    WHERE user_id = target AND created_at > now() - interval '1 minute';
  IF minute_count >= 60 THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'Rate limit exceeded: max 60 MCP calls per minute. Please retry in a few seconds.');
  END IF;

  SELECT count(*) INTO day_count
    FROM public.mcp_audit_log
    WHERE user_id = target AND created_at > now() - interval '1 day';
  IF day_count >= 2000 THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'Daily quota exceeded: max 2000 MCP calls per 24 hours.');
  END IF;

  SELECT count(*) INTO tool_hour_count
    FROM public.mcp_audit_log
    WHERE user_id = target AND tool_name = _tool AND created_at > now() - interval '1 hour';

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
$function$;

REVOKE ALL ON FUNCTION public.mcp_check_rate_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_check_rate_limit(uuid, text) TO authenticated, service_role;