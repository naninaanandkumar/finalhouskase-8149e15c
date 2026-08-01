// Shared Ekart API helpers — strictly follows the official Ekart OpenAPI spec
// (Ekart API Docs 3.8.9, server https://app.elite.ekartlogistics.in)

export const EKART_BASE = Deno.env.get("EKART_BASE_URL") || "https://app.elite.ekartlogistics.in";

export const AUTH_PATH = (clientId: string) =>
  `/integrations/v2/auth/token/${encodeURIComponent(clientId)}`;
export const CREATE_SHIPMENT_PATH = "/api/v1/package/create"; // PUT
export const CANCEL_SHIPMENT_PATH = "/api/v1/package/cancel"; // DELETE ?tracking_id=
export const TRACK_PATH = (id: string) => `/api/v1/track/${encodeURIComponent(id)}`; // GET (open)

export interface EkartCreds {
  clientId: string;
  username: string;
  password: string;
}

export function readCreds(): { creds?: EkartCreds; missing: string[] } {
  const clientId = Deno.env.get("EKART_CLIENT_ID") ?? "";
  const username = Deno.env.get("EKART_USERNAME") ?? "";
  const password = Deno.env.get("EKART_PASSWORD") ?? "";
  const missing: string[] = [];
  if (!clientId) missing.push("EKART_CLIENT_ID");
  if (!username) missing.push("EKART_USERNAME");
  if (!password) missing.push("EKART_PASSWORD");
  if (missing.length) return { missing };
  return { creds: { clientId, username, password }, missing };
}

interface CachedToken {
  token: string;
  tokenType: string;
  expiresAt: number; // epoch ms
  cacheKey: string;
}

// Module-scope cache: survives across invocations on a warm isolate.
let cached: CachedToken | null = null;

export interface AuthResult {
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  fromCache: boolean;
  status: number;
  /** Response body with any credential-like fields stripped. */
  safeResponse: unknown;
  error?: string;
}

function stripSecrets(v: unknown): unknown {
  if (!v || typeof v !== "object") return v;
  const clone: Record<string, unknown> = { ...(v as Record<string, unknown>) };
  for (const k of Object.keys(clone)) {
    if (/password|secret|token/i.test(k)) clone[k] = "[redacted]";
  }
  return clone;
}

/**
 * Fetch (or reuse) an Ekart access token.
 * POST /integrations/v2/auth/token/{client_id}  body: { username, password }
 * Response: { access_token, scope, expires_in, token_type }
 */
export async function getAccessToken(creds: EkartCreds, forceRefresh = false): Promise<AuthResult> {
  const cacheKey = `${creds.clientId}:${creds.username}`;
  const now = Date.now();

  if (!forceRefresh && cached && cached.cacheKey === cacheKey && cached.expiresAt > now + 60_000) {
    return {
      token: cached.token,
      tokenType: cached.tokenType,
      fromCache: true,
      status: 200,
      safeResponse: { cached: true, expires_at: new Date(cached.expiresAt).toISOString() },
    };
  }

  const url = `${EKART_BASE}${AUTH_PATH(creds.clientId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // NOTE: the official spec requires username + password only. No client_secret.
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    });
  } catch (e) {
    return { fromCache: false, status: 0, safeResponse: null, error: (e as Error).message };
  }

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch { /* keep raw text */ }

  const b = (body ?? {}) as Record<string, any>;
  const token: string | undefined = b.access_token;
  const tokenType: string = b.token_type || "Bearer";
  const expiresIn: number = Number(b.expires_in) || 0;

  if (!res.ok || !token) {
    return {
      fromCache: false,
      status: res.status,
      safeResponse: stripSecrets(body),
      error: b?.message || b?.error || `Auth failed with HTTP ${res.status}`,
    };
  }

  cached = {
    token,
    tokenType,
    // Refresh 5 minutes before actual expiry.
    expiresAt: now + Math.max(expiresIn - 300, 60) * 1000,
    cacheKey,
  };

  return {
    token,
    tokenType,
    expiresIn,
    fromCache: false,
    status: res.status,
    safeResponse: { scope: b.scope, expires_in: expiresIn, token_type: tokenType, access_token: "[redacted]" },
  };
}

export function invalidateToken() {
  cached = null;
}

/** Digits-only phone as int64, per locationV1.phone (10 digits). */
export function toPhoneNumber(raw: unknown): number | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  if (ten.length !== 10) return null;
  const n = Number(ten);
  return Number.isFinite(n) ? n : null;
}

export function toPin(raw: unknown): number | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return Number(digits);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
