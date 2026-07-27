import { supabase } from "@/integrations/supabase/client";
import type { PWADiagnostics } from "./pwaDiagnostics";

export type PWATelemetryEvent =
  | "page_load"
  | "install_available"
  | "install_prompt_shown"
  | "install_accepted"
  | "install_dismissed"
  | "install_completed"
  | "ios_instructions_shown"
  | "diagnostics_run"
  | "manifest_invalid"
  | "sw_registration_failed";

const SESSION_SENT = new Set<string>();

export async function sendPWATelemetry(
  event: PWATelemetryEvent,
  diag: PWADiagnostics | null,
  extra?: { outcome?: string; meta?: Record<string, unknown>; dedupe?: boolean }
) {
  try {
    if (extra?.dedupe && SESSION_SENT.has(event)) return;
    SESSION_SENT.add(event);

    const { data: userRes } = await supabase.auth.getUser();
    const payload = {
      user_id: userRes?.user?.id ?? null,
      event,
      platform: diag?.platform ?? null,
      is_standalone: diag?.isStandalone ?? null,
      sw_registered: diag?.serviceWorkerRegistered ?? null,
      sw_scope: diag?.serviceWorkerScope ?? null,
      manifest_ok: diag ? diag.manifestParsed && diag.manifestErrors.length === 0 : null,
      manifest_errors: diag?.manifestErrors ?? null,
      before_install_prompt_fired: diag?.beforeInstallPromptFired ?? null,
      outcome: extra?.outcome ?? null,
      user_agent: navigator.userAgent.slice(0, 512),
      url: window.location.href.slice(0, 512),
      meta: extra?.meta ?? null,
    };
    await supabase.from("pwa_telemetry" as any).insert(payload);
  } catch (err) {
    // Telemetry must never break the app
    // eslint-disable-next-line no-console
    console.warn("[PWA] telemetry send failed", err);
  }
}
