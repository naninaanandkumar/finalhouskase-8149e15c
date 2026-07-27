import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Per-user rate limits and per-tool quotas for the MCP endpoint. Enforced by
 * the mcp_check_rate_limit() Postgres function so bursts across multiple
 * concurrent tool calls all see the same authoritative counters.
 */

function adminClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function checkRateLimit(
  toolName: string,
  ctx: ToolContext,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!ctx.isAuthenticated()) return { ok: true };
  try {
    const supabase = adminClient();
    const { data, error } = await supabase.rpc("mcp_check_rate_limit", {
      _user: ctx.getUserId(),
      _tool: toolName,
    });
    if (error) return { ok: true }; // fail-open on infra errors
    const result = data as { ok?: boolean; reason?: string } | null;
    if (result && result.ok === false) {
      return { ok: false, reason: result.reason ?? "Rate limit exceeded." };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
