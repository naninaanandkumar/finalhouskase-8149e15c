import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";

// Validate `next` is a same-origin relative path so we can't be tricked into
// redirecting to another site after login.
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // If a session is already active, don't get stuck on /login — send them on.
  // (Fixes cases where /login appears blank because the user is already signed
  // in, e.g. after the OAuth consent redirect roundtrip.)
  useEffect(() => {
    if (!authLoading && user) {
      navigate(next ?? "/", { replace: true });
    }
  }, [authLoading, user, next, navigate]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      isAdmin = !!roles?.some((r) => r.role === "admin");
    }
    toast({ title: isAdmin ? "Welcome Admin!" : "Welcome back!", description: "Signed in successfully." });
    // Honor `next` (e.g. OAuth consent redirect) before falling back to defaults.
    if (next) {
      navigate(next, { replace: true });
    } else {
      navigate(isAdmin ? "/admin" : "/");
    }
    setIsLoading(false);
  };

  return (
    <AuthShell mode="login">
      <SEOHead title="Sign In" description="Sign in to your Houskase account to track orders, manage bulk quote requests, and check out faster with saved addresses." />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@example.com" className="pl-10 h-11"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password"
                className="pl-10 pr-10 h-11" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-white hover:opacity-90" style={{ backgroundColor: "#AD1E2A" }} disabled={isLoading}>
            {isLoading ? "Signing In..." : "Login In"}
          </Button>
        </form>
      </motion.div>
    </AuthShell>
  );
}
