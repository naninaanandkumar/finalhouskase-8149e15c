import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

// denomailer surfaces connection failures as background rejections which would
// otherwise kill the worker mid-request (client sees a CORS/network error).
addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.error('Unhandled rejection (suppressed):', (event as PromiseRejectionEvent).reason);
});




const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Primary (Hostinger)
const SMTP_HOST = Deno.env.get('SMTP_HOST')!;
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10);
const SMTP_USER = Deno.env.get('SMTP_USER')!;
const SMTP_PASS = Deno.env.get('SMTP_PASS')!;
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER;

// Optional fallback SMTP (e.g. secondary Hostinger mailbox, Gmail, Zoho, etc.)
const SMTP_FALLBACK_HOST = Deno.env.get('SMTP_FALLBACK_HOST') || '';
const SMTP_FALLBACK_PORT = parseInt(Deno.env.get('SMTP_FALLBACK_PORT') || '465', 10);
const SMTP_FALLBACK_USER = Deno.env.get('SMTP_FALLBACK_USER') || '';
const SMTP_FALLBACK_PASS = Deno.env.get('SMTP_FALLBACK_PASS') || '';
const SMTP_FALLBACK_FROM = Deno.env.get('SMTP_FALLBACK_FROM') || SMTP_FALLBACK_USER;

// Optional Resend API fallback (used only if RESEND_API_KEY is set)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') || SMTP_FROM;

const OTP_TTL_MIN = 10;
const RESEND_COOLDOWN_SEC = 60;
const EMAIL_RATE_LIMIT_WINDOW_MIN = 15;
const EMAIL_RATE_LIMIT_MAX = 5;
const IP_RATE_LIMIT_WINDOW_MIN = 15;
const IP_RATE_LIMIT_MAX = 20;
const PRIMARY_SMTP_MAX_ATTEMPTS = 3;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateOtp() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, '0');
}

function buildEmailHtml(code: string, fullName: string | null) {
  const name = fullName?.trim() || 'there';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#AD1E2A;padding:24px 28px;">
          <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">Houskase</div>
          <div style="color:#ffe3e6;font-size:13px;margin-top:2px;">Premium everyday essentials</div>
        </td></tr>
        <tr><td style="padding:32px 28px 8px 28px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1a1a1a;">Verify your email</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#4a4a4a;">Hi ${name}, use the code below to finish creating your Houskase account. This code expires in ${OTP_TTL_MIN} minutes.</p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;padding:18px 28px;background:#faf1f2;border:1px solid #f2d4d7;border-radius:12px;">
              <div style="font-family:'SFMono-Regular',Consolas,monospace;font-size:34px;letter-spacing:10px;font-weight:700;color:#AD1E2A;">${code}</div>
            </div>
          </div>
          <p style="margin:0 0 6px 0;font-size:13px;color:#6b6b6b;line-height:1.55;">If you didn't request this, you can safely ignore this email — no account will be created.</p>
        </td></tr>
        <tr><td style="padding:20px 28px 28px 28px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#8a8a8a;">© ${new Date().getFullYear()} Houskase. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

interface SendResult {
  ok: boolean;
  provider: string;
  attemptNo?: number;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  response?: string;
}

interface ExistingAuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || null;
}

function isTransientFailure(result: SendResult) {
  const raw = `${result.errorCode ?? ''} ${result.errorMessage ?? ''} ${result.response ?? ''}`.toLowerCase();
  return (
    /\b5\d\d\b/.test(raw) ||
    raw.includes('timeout') ||
    raw.includes('temporar') ||
    raw.includes('try again') ||
    raw.includes('econnreset') ||
    raw.includes('econnrefused') ||
    raw.includes('network') ||
    raw.includes('connection')
  );
}

async function getAuthUserByEmail(email: string): Promise<ExistingAuthUser | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    const users = Array.isArray(body?.users) ? body.users : [];
    const user = users.find((u: any) => typeof u?.email === 'string' && u.email.toLowerCase() === email);
    return user ? { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at ?? null } : null;
  } catch (err) {
    console.error('auth user lookup failed', err);
    return null;
  }
}

function normalizeFromAddress(raw: string, fallback: string): string {
  const s = (raw || '').trim();
  const emailOnly = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
  const nameAndEmail = /^.+<\s*[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+\s*>$/;
  if (nameAndEmail.test(s)) return s;
  if (emailOnly.test(s)) return s;
  const m = s.match(/[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+/);
  if (m) {
    const email = m[0];
    const name = s.replace(email, '').replace(/[<>"]/g, '').replace(/,/g, ' ').trim();
    return name ? `${name} <${email}>` : email;
  }
  return fallback;
}

async function sendViaSmtp(
  cfg: { host: string; port: number; user: string; pass: string; from: string },
  to: string,
  subject: string,
  text: string,
  html: string,
  messageId: string,
): Promise<SendResult> {
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return {
      ok: false,
      provider: 'smtp:not-configured',
      errorCode: 'EMAIL_NOT_CONFIGURED',
      errorMessage: 'Email sending is not configured yet (missing SMTP_HOST / SMTP_USER / SMTP_PASS).',
    };
  }
  const client = new SMTPClient({
    connection: {
      hostname: cfg.host,
      port: cfg.port,
      tls: cfg.port === 465,
      auth: { username: cfg.user, password: cfg.pass },
    },
  });

  try {
    await client.send({
      from: normalizeFromAddress(cfg.from, cfg.user),
      to,
      subject,
      content: text,
      html,
      headers: { 'Message-ID': `<${messageId}@houskase.com>` },
    });
    await client.close();
    return { ok: true, provider: `smtp:${cfg.host}`, messageId, response: 'Message accepted by SMTP server' };
  } catch (err: any) {
    try { await client.close(); } catch (_) {}
    return {
      ok: false,
      provider: `smtp:${cfg.host}`,
      errorCode: err?.code || err?.name || 'SMTP_ERROR',
      errorMessage: err?.message || 'SMTP send failed',
      response: typeof err?.response === 'string' ? err.response : (err?.responseText ?? err?.message ?? undefined),
    };
  }
}

async function sendViaSmtpWithBackoff(
  cfg: { host: string; port: number; user: string; pass: string; from: string },
  to: string,
  subject: string,
  text: string,
  html: string,
  messageId: string,
  maxAttempts = PRIMARY_SMTP_MAX_ATTEMPTS,
): Promise<{ final: SendResult; attempts: SendResult[] }> {
  const attempts: SendResult[] = [];
  for (let i = 1; i <= maxAttempts; i++) {
    const result = await sendViaSmtp(cfg, to, subject, text, html, messageId);
    result.attemptNo = i;
    attempts.push(result);
    if (result.ok || !isTransientFailure(result) || i === maxAttempts) {
      return { final: result, attempts };
    }
    await sleep(350 * 2 ** (i - 1));
  }
  return { final: attempts[attempts.length - 1], attempts };
}

async function sendViaResend(to: string, subject: string, html: string): Promise<SendResult> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
    const bodyText = await resp.text();
    if (!resp.ok) {
      return {
        ok: false,
        provider: 'resend',
        errorCode: `HTTP_${resp.status}`,
        errorMessage: bodyText.slice(0, 500),
        response: bodyText.slice(0, 500),
      };
    }
    let msgId: string | undefined;
    try { msgId = JSON.parse(bodyText)?.id; } catch (_) {}
    return { ok: true, provider: 'resend', messageId: msgId, response: bodyText.slice(0, 500) };
  } catch (err: any) {
    return {
      ok: false,
      provider: 'resend',
      errorCode: err?.name || 'RESEND_ERROR',
      errorMessage: err?.message || 'Resend request failed',
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { email, password, fullName } = body;
    const correlationId: string =
      (typeof body?.correlationId === 'string' && body.correlationId) ||
      req.headers.get('x-correlation-id') ||
      crypto.randomUUID();

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email', correlationId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
      return new Response(JSON.stringify({ error: 'Password must be 6-200 characters', correlationId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }
    if (fullName && (typeof fullName !== 'string' || fullName.length > 120)) {
      return new Response(JSON.stringify({ error: 'Invalid name', correlationId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const ip = clientIp(req);
    const userAgent = req.headers.get('user-agent') || null;

    const logEvent = async (event_type: string, status: 'success' | 'warning' | 'error', error_message?: string, metadata?: Record<string, unknown>) => {
      try {
        const eventMetadata = metadata ?? {};
        const eventCorrelationId =
          typeof eventMetadata.chainCorrelationId === 'string' ? eventMetadata.chainCorrelationId : correlationId;
        await supabase.from('signup_otp_events').insert({
          email: normalizedEmail,
          event_type,
          status,
          error_message: error_message ?? null,
          ip,
          user_agent: userAgent,
          metadata: {
            ...eventMetadata,
            correlationId: eventCorrelationId,
            requestedCorrelationId: eventMetadata.requestedCorrelationId ?? correlationId,
          },
        });
      } catch (e) {
        console.error('log event failed', e);
      }
    };

    const { data: existingProfile } = await supabase
      .from('profiles').select('user_id').eq('email', normalizedEmail).maybeSingle();
    if (existingProfile) {
      await logEvent('already_exists', 'error', 'Account already exists');
      await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
      return new Response(JSON.stringify({ error: 'An account with this email already exists. Please log in instead.', correlationId }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }

    const existingAuthUser = await getAuthUserByEmail(normalizedEmail);
    if (existingAuthUser) {
      if (!existingAuthUser.email_confirmed_at) {
        const { error: deleteErr } = await supabase.auth.admin.deleteUser(existingAuthUser.id);
        if (deleteErr) {
          await logEvent('failed', 'error', `Could not clear incomplete signup: ${deleteErr.message}`, {
            authUserId: existingAuthUser.id,
            cleanup: 'orphan_unconfirmed_auth_failed',
          });
          return new Response(JSON.stringify({
            error: 'A previous incomplete signup exists for this email. Please try again in a few minutes or contact support.',
            detail: deleteErr.message,
            correlationId,
          }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
        }
        await logEvent('failed', 'warning', 'Cleared incomplete previous signup before sending OTP', {
          authUserId: existingAuthUser.id,
          cleanup: 'orphan_unconfirmed_auth_cleared',
        });
      } else {
        await supabase.from('profiles').upsert({
          user_id: existingAuthUser.id,
          email: normalizedEmail,
          full_name: fullName ?? null,
        }, { onConflict: 'user_id' });
        await logEvent('already_exists', 'error', 'Account already exists in auth');
        await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
        return new Response(JSON.stringify({ error: 'An account with this email already exists. Please log in instead.', correlationId }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
      }
    }

    const rateWindow = new Date(Date.now() - EMAIL_RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const sendEvents = ['sent', 'resent', 'send_failed', 'rate_limited'];

    const { count: emailCount } = await supabase
      .from('signup_otp_events')
      .select('id', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .in('event_type', sendEvents)
      .gte('created_at', rateWindow);

    if ((emailCount ?? 0) >= EMAIL_RATE_LIMIT_MAX) {
      const retryAfter = EMAIL_RATE_LIMIT_WINDOW_MIN * 60;
      await logEvent('rate_limited', 'warning', `Email rate limit reached (${emailCount}/${EMAIL_RATE_LIMIT_MAX})`, {
        limitType: 'email',
        retryAfter,
        max: EMAIL_RATE_LIMIT_MAX,
        windowMin: EMAIL_RATE_LIMIT_WINDOW_MIN,
      });
      return new Response(JSON.stringify({ error: `Too many OTP requests for this email. Please retry after ${EMAIL_RATE_LIMIT_WINDOW_MIN} minutes.`, retryAfter, correlationId }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }

    if (ip) {
      const ipWindow = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
      const { count: ipCount } = await supabase
        .from('signup_otp_events')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .in('event_type', sendEvents)
        .gte('created_at', ipWindow);

      if ((ipCount ?? 0) >= IP_RATE_LIMIT_MAX) {
        const retryAfter = IP_RATE_LIMIT_WINDOW_MIN * 60;
        await logEvent('rate_limited', 'warning', `IP rate limit reached (${ipCount}/${IP_RATE_LIMIT_MAX})`, {
          limitType: 'ip',
          retryAfter,
          max: IP_RATE_LIMIT_MAX,
          windowMin: IP_RATE_LIMIT_WINDOW_MIN,
        });
        return new Response(JSON.stringify({ error: `Too many OTP requests from this network. Please retry after ${IP_RATE_LIMIT_WINDOW_MIN} minutes.`, retryAfter, correlationId }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
      }
    }

    const { data: existingOtp } = await supabase
      .from('signup_otps').select('resend_available_at, correlation_id').eq('email', normalizedEmail).maybeSingle();
    const isResend = !!existingOtp;
    const chainCorrelationId = existingOtp?.correlation_id || correlationId;

    if (existingOtp?.resend_available_at && new Date(existingOtp.resend_available_at) > new Date()) {
      const secs = Math.ceil((new Date(existingOtp.resend_available_at).getTime() - Date.now()) / 1000);
      await logEvent('rate_limited', 'warning', `Cooldown ${secs}s remaining`, {
        chainCorrelationId,
        requestedCorrelationId: correlationId,
        retryAfter: secs,
        limitType: 'cooldown',
      });
      return new Response(JSON.stringify({ error: `Please wait ${secs}s before requesting a new code.`, retryAfter: secs, correlationId: chainCorrelationId }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': chainCorrelationId } });
    }

    const code = generateOtp();
    const codeHash = await sha256(code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MIN * 60 * 1000).toISOString();
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_SEC * 1000).toISOString();

    const { error: upsertErr } = await supabase.from('signup_otps').upsert({
      email: normalizedEmail,
      code_hash: codeHash,
      full_name: fullName ?? null,
      password: null,
      attempts: 0,
      expires_at: expiresAt,
      resend_available_at: resendAvailableAt,
      correlation_id: chainCorrelationId,
    });
    if (upsertErr) {
      await logEvent('send_failed', 'error', upsertErr.message);
      return new Response(JSON.stringify({ error: 'Failed to store verification code', correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }

    // Store the password encrypted at rest via pgcrypto; the raw value never
    // lives in the signup_otps table.
    const encKey = Deno.env.get('SIGNUP_OTP_ENC_KEY');
    if (!encKey) {
      await logEvent('send_failed', 'error', 'Missing SIGNUP_OTP_ENC_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfigured', correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }
    const { error: encErr } = await supabase.rpc('signup_otp_set_password', {
      _email: normalizedEmail,
      _password: password,
      _key: encKey,
    });
    if (encErr) {
      await logEvent('send_failed', 'error', `encrypt password failed: ${encErr.message}`);
      return new Response(JSON.stringify({ error: 'Failed to store verification code', correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId } });
    }

    const subject = `Your Houskase verification code: ${code}`;
    const text = `Your Houskase verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`;
    const html = buildEmailHtml(code, fullName ?? null);
    const messageId = crypto.randomUUID();

    let attempts: SendResult[] = [];

    // 1. Primary Hostinger SMTP
    const primary = await sendViaSmtpWithBackoff(
      { host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass: SMTP_PASS, from: SMTP_FROM },
      normalizedEmail, subject, text, html, messageId,
    );
    attempts = attempts.concat(primary.attempts);

    let final: SendResult = primary.final;

    // 2. Fallback SMTP
    if (!final.ok && SMTP_FALLBACK_HOST && SMTP_FALLBACK_USER && SMTP_FALLBACK_PASS) {
      const fb = await sendViaSmtp(
        { host: SMTP_FALLBACK_HOST, port: SMTP_FALLBACK_PORT, user: SMTP_FALLBACK_USER, pass: SMTP_FALLBACK_PASS, from: SMTP_FALLBACK_FROM },
        normalizedEmail, subject, text, html, messageId,
      );
      fb.attemptNo = attempts.length + 1;
      attempts.push(fb);
      final = fb;
    }

    // 3. Fallback Resend
    if (!final.ok && RESEND_API_KEY) {
      const rs = await sendViaResend(normalizedEmail, subject, html);
      rs.attemptNo = attempts.length + 1;
      attempts.push(rs);
      final = rs;
    }

    for (const attempt of attempts) {
      await logEvent('send_retry', attempt.ok ? 'success' : 'warning', attempt.ok ? undefined : `${attempt.errorCode ?? ''}: ${attempt.errorMessage ?? ''}`.trim(), {
        messageId: attempt.messageId ?? messageId,
        provider: attempt.provider,
        providerResponse: attempt.response,
        attemptNo: attempt.attemptNo,
        ok: attempt.ok,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
        chainCorrelationId,
        requestedCorrelationId: correlationId,
      });
    }

    if (!final.ok) {
      await logEvent('send_failed', 'error', `${final.errorCode}: ${final.errorMessage}`, {
        messageId, attempts,
        providerResponse: final.response,
        provider: final.provider,
        chainCorrelationId,
        requestedCorrelationId: correlationId,
      });
      return new Response(JSON.stringify({ error: 'Could not send verification email. Please try again.', detail: `${final.errorCode ?? ''}: ${final.errorMessage ?? ''}`.trim(), provider: final.provider, correlationId: chainCorrelationId }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': chainCorrelationId } });
    }

    await logEvent(isResend ? 'resent' : 'sent', 'success', undefined, {
      expiresInMin: OTP_TTL_MIN,
      messageId: final.messageId ?? messageId,
      provider: final.provider,
      providerResponse: final.response,
      attempts,
      retryCount: attempts.length - 1,
      chainCorrelationId,
      requestedCorrelationId: correlationId,
    });

    return new Response(JSON.stringify({
      success: true,
      resendAvailableInSec: RESEND_COOLDOWN_SEC,
      expiresInMin: OTP_TTL_MIN,
      sentAt: now.toISOString(),
      provider: final.provider,
      messageId: final.messageId ?? messageId,
      retryCount: Math.max(0, attempts.length - 1),
      correlationId: chainCorrelationId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': chainCorrelationId } });
  } catch (e) {
    console.error('send-signup-otp error', e);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
