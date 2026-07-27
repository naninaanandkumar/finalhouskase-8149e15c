import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};


const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const SMTP_HOST = Deno.env.get('SMTP_HOST')!;
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10);
const SMTP_USER = Deno.env.get('SMTP_USER')!;
const SMTP_PASS = Deno.env.get('SMTP_PASS')!;
const SMTP_FROM_RAW = Deno.env.get('SMTP_FROM') || SMTP_USER;

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

const SMTP_FROM = normalizeFromAddress(SMTP_FROM_RAW, SMTP_USER);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden - admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { to, subject, message } = await req.json();
    if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid "to" email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const started = Date.now();
    const messageId = crypto.randomUUID();
    const finalSubject = (typeof subject === 'string' && subject.trim()) || 'Houskase SMTP test';
    const bodyText = (typeof message === 'string' && message.trim()) || `This is a test email from Houskase admin panel.\nSent at ${new Date().toISOString()}\nMessage ID: ${messageId}`;

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: SMTP_PORT === 465,
        auth: { username: SMTP_USER, password: SMTP_PASS },
      },
    });

    try {
      await client.send({
        from: SMTP_FROM,
        to,
        subject: finalSubject,
        content: bodyText,
        html: `<div style="font-family:Arial,sans-serif;padding:16px;color:#1a1a1a;">
          <h2 style="color:#AD1E2A;margin:0 0 8px;">Houskase SMTP test</h2>
          <p style="margin:0 0 12px;color:#4a4a4a;">${bodyText.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
          <p style="font-size:12px;color:#8a8a8a;margin-top:16px;">Message ID: ${messageId}</p>
        </div>`,
        headers: { 'Message-ID': `<${messageId}@houskase.com>` },
      });
      await client.close();
      return new Response(JSON.stringify({
        success: true,
        provider: `smtp:${SMTP_HOST}:${SMTP_PORT}`,
        messageId,
        from: SMTP_FROM,
        to,
        elapsedMs: Date.now() - started,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err: any) {
      try { await client.close(); } catch (_) {}
      return new Response(JSON.stringify({
        success: false,
        provider: `smtp:${SMTP_HOST}:${SMTP_PORT}`,
        errorCode: err?.code || err?.name || 'SMTP_ERROR',
        errorMessage: err?.message || 'SMTP send failed',
        response: typeof err?.response === 'string' ? err.response : (err?.responseText ?? null),
        stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 6).join('\n') : null,
        elapsedMs: Date.now() - started,
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (e: any) {
    console.error('send-test-email error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
