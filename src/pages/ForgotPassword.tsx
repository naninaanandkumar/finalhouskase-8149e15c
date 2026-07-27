import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { checkRateLimit } from "@/lib/security";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchLogo = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "store").maybeSingle();
      if (data?.value) {
        const v = data.value as any;
        if (v.logoUrl) setLogoUrl(v.logoUrl);
      }
    };
    fetchLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateCheck = checkRateLimit(`forgot_${email}`, 3, 15 * 60 * 1000, 30 * 60 * 1000);
    if (!rateCheck.allowed) {
      toast({ title: "Too Many Attempts", description: "Please wait before trying again.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-background">
        <SEOHead title="Check Your Email" description="We've emailed you a password-reset link for your Houskase account. Follow the link within 30 minutes to set a new password." noIndex />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Check Your Email</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We've sent a password reset link to <strong>{email}</strong>. Click the link in your email to reset your password.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-background">
      <SEOHead title="Forgot Password" description="Reset your Houskase account password securely. Enter your email and we'll send a password-reset link within a minute." noIndex />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
          ) : (
            <>
              <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center">
                <span className="text-lg font-bold text-accent-foreground">B</span>
              </div>
              <span className="text-lg font-display font-bold text-foreground">
                B2B<span className="text-accent">Market</span>
              </span>
            </>
          )}
        </Link>

        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Forgot Password?</h1>
        <p className="text-muted-foreground text-sm mb-6">Enter your email and we'll send you a reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className="pl-10 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-gradient-accent hover:opacity-90 h-11 text-sm font-semibold" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="text-accent font-medium hover:underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
