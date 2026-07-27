import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Local typed wrapper around the beta supabase.auth.oauth namespace so
// TypeScript doesn't complain if types aren't published yet.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load authorization request.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("No redirect returned by the authorization server.");
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Something went wrong.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        {error ? (
          <div className="text-center space-y-3">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold text-foreground">Authorization error</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <div className="text-center space-y-3 py-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Loading authorization request…</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <ShieldCheck className="mx-auto h-10 w-10 text-accent mb-2" />
              <h1 className="text-2xl font-semibold text-foreground">
                Connect {details.client?.name ?? "an app"} to Houskase
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This lets {details.client?.name ?? "the app"} access Houskase as you — browse products
                and read your own orders, quotes, and profile. It cannot see anyone else's data.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                disabled={busy}
                onClick={() => decide(true)}
                className="w-full bg-accent hover:bg-accent-hover text-accent-foreground"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
              </Button>
              <Button
                disabled={busy}
                onClick={() => decide(false)}
                variant="outline"
                className="w-full"
              >
                Deny
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
