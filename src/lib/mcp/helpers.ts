import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { recordMcpCall } from "./audit";
import { checkRateLimit } from "./rateLimit";

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/**
 * Wrap a tool handler with rate limiting + structured audit logging. Every
 * call is checked against per-user + per-tool quotas first; then logged with
 * an input hash, timing, and outcome.
 */
export function withAudit<Args, Result>(
  toolName: string,
  fn: (args: Args, ctx: ToolContext) => Promise<Result>,
): (args: Args, ctx: ToolContext) => Promise<any> {
  return async (args, ctx) => {
    const started = Date.now();

    // 1. Rate limit / quota check
    const gate = await checkRateLimit(toolName, ctx);
    if (gate.ok === false) {
      const reason = gate.reason;
      // Derive a human-friendly retry-after hint from the specific limit that
      // tripped, so the calling assistant can tell the user when to try again.
      let retryHint = "Please retry shortly.";
      if (/per minute/i.test(reason)) retryHint = "Try again in about 60 seconds.";
      else if (/per hour/i.test(reason)) retryHint = "Try again in about an hour.";
      else if (/24 hours|per day/i.test(reason)) retryHint = "Your daily quota resets in 24 hours — try again tomorrow.";

      const friendly =
        `⏳ ${reason}\n\n${retryHint}\n\n` +
        `This limit protects Houskase from runaway agent retries. ` +
        `If you need higher limits, contact the Houskase team.`;

      recordMcpCall({
        toolName,
        input: args,
        ctx,
        durationMs: Date.now() - started,
        status: "error",
        error: `rate_limited: ${reason}`,
      });
      return {
        content: [{ type: "text", text: friendly }],
        isError: true,
      };
    }

    // 2. Run the tool handler
    try {
      const result = await fn(args, ctx);
      recordMcpCall({
        toolName,
        input: args,
        ctx,
        durationMs: Date.now() - started,
        status: "ok",
      });
      return result;
    } catch (err) {
      recordMcpCall({
        toolName,
        input: args,
        ctx,
        durationMs: Date.now() - started,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}
