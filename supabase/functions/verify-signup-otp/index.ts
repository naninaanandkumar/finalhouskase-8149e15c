import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};


const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_ATTEMPTS = 5;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function authUserExists(email: string): Promise<boolean> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
    });
    if (!resp.ok) return false;
    const body = await resp.json();
    const users = Array.isArray(body?.users) ? body.users : [];
    return users.some((u: any) => typeof u?.email === 'string' && u.email.toLowerCase() === email);
  } catch (err) {
    console.error('auth user lookup failed', err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { email, code } = body;
    const requestCorrelationId: string | null =
      (typeof body?.correlationId === 'string' && body.correlationId) ||
      req.headers.get('x-correlation-id') ||
      null;

    if (typeof email !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid email or code', correlationId: requestCorrelationId }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    const logEvent = async (event_type: string, status: 'success' | 'warning' | 'error', error_message?: string, metadata?: Record<string, unknown>) => {
      try {
        const eventMetadata = metadata ?? {};
        const eventCorrelationId =
          typeof eventMetadata.chainCorrelationId === 'string' ? eventMetadata.chainCorrelationId : requestCorrelationId;
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
            requestedCorrelationId: eventMetadata.requestedCorrelationId ?? requestCorrelationId,
          },
        });
      } catch (e) {
        console.error('log event failed', e);
      }
    };

    const { data: row, error: fetchErr } = await supabase
      .from('signup_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchErr) {
      console.error('fetch err', fetchErr);
      return new Response(JSON.stringify({ error: 'Server error', correlationId: requestCorrelationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!row) {
      await logEvent('failed', 'error', 'No pending verification');
      return new Response(JSON.stringify({ error: 'No verification pending for this email. Please sign up again.', correlationId: requestCorrelationId }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const correlationId = row.correlation_id || requestCorrelationId;

    if (new Date(row.expires_at) < new Date()) {
      await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
      await logEvent('expired', 'warning', 'Code expired', { chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: 'This code has expired. Please request a new one.', correlationId }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
      await logEvent('max_attempts_reached', 'error', 'Too many attempts', { chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: 'Too many incorrect attempts. Please request a new code.', maxAttemptsReached: true, correlationId }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    const codeHash = await sha256(code);
    if (codeHash !== row.code_hash) {
      const newAttempts = row.attempts + 1;
      await supabase.from('signup_otps').update({ attempts: newAttempts }).eq('email', normalizedEmail);
      const remaining = MAX_ATTEMPTS - newAttempts;
      if (remaining <= 0) {
        await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
        await logEvent('max_attempts_reached', 'error', 'Exhausted attempts', { chainCorrelationId: correlationId, attemptsLeft: 0 });
        return new Response(JSON.stringify({ error: 'Too many incorrect attempts. Please request a new code.', maxAttemptsReached: true, attemptsLeft: 0, correlationId }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
      }
      await logEvent('failed', 'warning', `Incorrect code (${remaining} left)`, { attemptsLeft: remaining, chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`, attemptsLeft: remaining, correlationId }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    if (await authUserExists(normalizedEmail)) {
      await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
      await logEvent('already_exists', 'error', 'Account already exists before OTP completion', { chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: 'This account already exists. Please log in.', correlationId }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    // Decrypt the pending password (never stored as plaintext at rest).
    const encKey = Deno.env.get('SIGNUP_OTP_ENC_KEY');
    if (!encKey) {
      await logEvent('failed', 'error', 'Missing SIGNUP_OTP_ENC_KEY', { chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: 'Server misconfigured', correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }
    const { data: pwPlain, error: pwErr } = await supabase.rpc('signup_otp_get_password', {
      _email: normalizedEmail,
      _key: encKey,
    });
    if (pwErr || !pwPlain) {
      await logEvent('failed', 'error', `decrypt password failed: ${pwErr?.message ?? 'no password on record'}`, { chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: 'Could not complete signup. Please request a new code.', correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    // Success — create the auth user
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: pwPlain as string,
      email_confirm: true,
      user_metadata: { full_name: row.full_name ?? undefined },

    });

    if (createErr) {
      console.error('createUser err', createErr);
      const message = createErr.message?.toLowerCase() || '';
      if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
        await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
        await logEvent('already_exists', 'error', createErr.message, { chainCorrelationId: correlationId });
        return new Response(JSON.stringify({ error: 'This account already exists. Please log in.', correlationId }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
      }
      await logEvent('failed', 'error', createErr.message, { chainCorrelationId: correlationId });
      return new Response(JSON.stringify({ error: 'Could not create account. Please try again.', detail: createErr.message, correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    const { error: profileErr } = await supabase.from('profiles').upsert({
      user_id: created.user?.id,
      email: normalizedEmail,
      full_name: row.full_name ?? null,
      is_active: true,
    }, { onConflict: 'user_id' });

    if (profileErr) {
      console.error('profile upsert err', profileErr);
      await logEvent('failed', 'error', profileErr.message, { chainCorrelationId: correlationId, userId: created.user?.id });
      return new Response(JSON.stringify({ error: 'Account was created, but profile setup failed. Please contact support.', detail: profileErr.message, correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    const { error: roleErr } = await supabase.from('user_roles').insert({
      user_id: created.user?.id,
      role: 'retail',
    });

    if (roleErr && roleErr.code !== '23505') {
      console.error('role insert err', roleErr);
      await logEvent('failed', 'error', roleErr.message, { chainCorrelationId: correlationId, userId: created.user?.id });
      return new Response(JSON.stringify({ error: 'Account was created, but role setup failed. Please contact support.', detail: roleErr.message, correlationId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
    }

    await supabase.from('signup_otps').delete().eq('email', normalizedEmail);
    await logEvent('verified', 'success', undefined, { userId: created.user?.id, chainCorrelationId: correlationId });

    return new Response(JSON.stringify({ success: true, userId: created.user?.id, correlationId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId ?? '' } });
  } catch (e) {
    console.error('verify-signup-otp error', e);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
