import { useMemo, useState } from "react";
import { z } from "zod";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client-side JSON validator used on the Connect page so users can sanity-check
 * a tool payload before pasting it into their AI assistant. Catches wrong shape,
 * missing required fields, and type mismatches locally — no network call.
 */

const TOOL_SCHEMAS: Record<string, z.ZodTypeAny> = {
  search_products: z
    .object({
      query: z.string().min(1, "query must be a non-empty string").optional(),
      category_slug: z.string().optional(),
      limit: z.number().int().positive().max(50).optional(),
    })
    .strict(),
  get_product: z
    .object({
      slug: z.string().min(1).optional(),
      id: z.string().uuid("id must be a UUID").optional(),
    })
    .strict()
    .refine((v) => !!(v.slug || v.id), { message: "Provide either `slug` or `id`" }),
  list_categories: z.object({}).strict(),
  list_my_orders: z
    .object({ limit: z.number().int().positive().max(50).optional() })
    .strict(),
  get_order: z
    .object({ order_number: z.string().regex(/^ORD-/, "must start with ORD-") })
    .strict(),
  get_order_timeline: z
    .object({ order_number: z.string().regex(/^ORD-/, "must start with ORD-") })
    .strict(),
  list_my_rfqs: z
    .object({ limit: z.number().int().positive().max(50).optional() })
    .strict(),
  create_rfq: z
    .object({
      items: z
        .array(
          z.object({
            product_id: z.string().uuid("product_id must be a UUID"),
            quantity: z.number().int().positive("quantity must be > 0"),
          }),
        )
        .min(1, "items must contain at least one entry"),
      notes: z.string().max(2000).optional(),
    })
    .strict(),
  initiate_checkout: z
    .object({
      shipping_address_id: z.string().uuid().optional(),
    })
    .strict(),
  get_my_profile: z.object({}).strict(),
};

type Feedback =
  | { kind: "idle" }
  | { kind: "ok"; parsed: unknown }
  | { kind: "err"; message: string };

export function ToolInputValidator({
  toolName,
  initial,
}: {
  toolName: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const schema = useMemo(() => TOOL_SCHEMAS[toolName], [toolName]);

  const validate = () => {
    if (!schema) {
      setFeedback({ kind: "err", message: `No schema registered for ${toolName}.` });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      setFeedback({
        kind: "err",
        message: `Not valid JSON — ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first.path.join(".") || "(root)";
      setFeedback({ kind: "err", message: `${path}: ${first.message}` });
      return;
    }
    setFeedback({ kind: "ok", parsed: result.data });
  };

  const reset = () => {
    setValue(initial);
    setFeedback({ kind: "idle" });
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Try it — validate your JSON input
        </span>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (feedback.kind !== "idle") setFeedback({ kind: "idle" });
        }}
        spellCheck={false}
        aria-label={`JSON input for ${toolName}`}
        className="w-full min-h-[110px] rounded-md border border-border bg-background px-3 py-2 text-[12px] font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <div className="flex items-center justify-between gap-3 mt-2">
        <Button size="sm" onClick={validate} className="h-8">
          Validate JSON
        </Button>
        {feedback.kind === "ok" && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Valid input for {toolName}
          </span>
        )}
        {feedback.kind === "err" && (
          <span className="inline-flex items-start gap-1 text-xs text-destructive font-medium max-w-[70%] text-right">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="break-words">{feedback.message}</span>
          </span>
        )}
      </div>
    </div>
  );
}
