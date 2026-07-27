const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};


const DOH_URL = 'https://cloudflare-dns.com/dns-query';

async function dohQuery(name: string, type: 'TXT' | 'MX') {
  const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  const resp = await fetch(url, { headers: { accept: 'application/dns-json' } });
  const body = await resp.json().catch(() => null);
  const answers = Array.isArray(body?.Answer) ? body.Answer : [];
  // TXT records come wrapped in quotes and may be split into chunks
  const values: string[] = answers.map((a: any) => {
    if (typeof a?.data !== 'string') return '';
    if (type === 'TXT') {
      return a.data
        .split(/"\s+"/g)
        .map((s: string) => s.replace(/^"|"$/g, ''))
        .join('');
    }
    return a.data;
  }).filter(Boolean);
  return { status: body?.Status ?? -1, values };
}

interface CheckResult {
  record: string;
  name: string;
  found: boolean;
  values: string[];
  ok: boolean;
  message: string;
}

function analyzeSpf(values: string[]): CheckResult {
  const spf = values.find((v) => v.toLowerCase().startsWith('v=spf1'));
  if (!spf) {
    return {
      record: 'SPF', name: '@', found: false, values, ok: false,
      message: 'No SPF record found. Add TXT @ with `v=spf1 include:_spf.mail.hostinger.com ~all`.',
    };
  }
  const includesHostinger = /_spf\.mail\.hostinger\.com/i.test(spf);
  return {
    record: 'SPF', name: '@', found: true, values: [spf], ok: includesHostinger,
    message: includesHostinger
      ? 'SPF record includes Hostinger.'
      : 'SPF exists but does not include `_spf.mail.hostinger.com`. Emails may be marked as spam.',
  };
}

function analyzeDmarc(values: string[]): CheckResult {
  const dmarc = values.find((v) => v.toLowerCase().startsWith('v=dmarc1'));
  if (!dmarc) {
    return {
      record: 'DMARC', name: '_dmarc', found: false, values, ok: false,
      message: 'No DMARC record. Add TXT _dmarc with `v=DMARC1; p=none; rua=mailto:postmaster@houskase.com`.',
    };
  }
  return {
    record: 'DMARC', name: '_dmarc', found: true, values: [dmarc], ok: true,
    message: 'DMARC record present.',
  };
}

function analyzeDkim(values: string[], selector: string): CheckResult {
  const dkim = values.find((v) => v.toLowerCase().includes('v=dkim1'));
  if (!dkim) {
    return {
      record: `DKIM (${selector})`, name: `${selector}._domainkey`, found: false, values, ok: false,
      message: `No DKIM record found at ${selector}._domainkey. Enable DKIM in Hostinger → Emails and add the TXT it shows.`,
    };
  }
  return {
    record: `DKIM (${selector})`, name: `${selector}._domainkey`, found: true, values: [dkim], ok: true,
    message: 'DKIM record present.',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const domain = (url.searchParams.get('domain') || 'houskase.com').trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      return new Response(JSON.stringify({ error: 'Invalid domain' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Try common DKIM selectors for Hostinger
    const selectors = ['hostingermail1', 'hostingermail-a', 'default', 'mail'];

    const [spfRes, dmarcRes, mxRes, ...dkimReses] = await Promise.all([
      dohQuery(domain, 'TXT'),
      dohQuery(`_dmarc.${domain}`, 'TXT'),
      dohQuery(domain, 'MX'),
      ...selectors.map((s) => dohQuery(`${s}._domainkey.${domain}`, 'TXT')),
    ]);

    const spf = analyzeSpf(spfRes.values);
    const dmarc = analyzeDmarc(dmarcRes.values);

    let dkim: CheckResult = {
      record: 'DKIM', name: '*._domainkey', found: false, values: [], ok: false,
      message: `No DKIM record found for common Hostinger selectors (${selectors.join(', ')}). Enable DKIM in Hostinger → Emails.`,
    };
    for (let i = 0; i < selectors.length; i++) {
      if (dkimReses[i].values.length > 0) {
        dkim = analyzeDkim(dkimReses[i].values, selectors[i]);
        break;
      }
    }

    const mx: CheckResult = {
      record: 'MX', name: '@', found: mxRes.values.length > 0, values: mxRes.values,
      ok: mxRes.values.some((v) => /hostinger|titan/i.test(v)),
      message: mxRes.values.length === 0
        ? 'No MX records. Email cannot be received on this domain.'
        : (mxRes.values.some((v) => /hostinger|titan/i.test(v))
            ? 'Hostinger MX records present.'
            : `MX records exist but don't point to Hostinger: ${mxRes.values.join(', ')}`),
    };

    const results = [spf, dkim, dmarc, mx];
    const allOk = results.every((r) => r.ok);

    return new Response(JSON.stringify({ domain, allOk, results, checkedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('check-email-dns error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
