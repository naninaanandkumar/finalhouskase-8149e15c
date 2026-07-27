CREATE TABLE IF NOT EXISTS public.mcp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  input_hash text NOT NULL,
  input_summary jsonb,
  duration_ms integer,
  status text NOT NULL DEFAULT 'ok',
  error text,
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_user_created
  ON public.mcp_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_tool
  ON public.mcp_audit_log (tool_name, created_at DESC);

GRANT SELECT ON public.mcp_audit_log TO authenticated;
GRANT ALL ON public.mcp_audit_log TO service_role;

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP call log"
  ON public.mcp_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all MCP call logs"
  ON public.mcp_audit_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_orders_audit ON public.orders;
CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();