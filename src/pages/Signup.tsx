import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail, Lock, Eye, EyeOff, User, ArrowLeft, CheckCircle2, Loader2, AlertTriangle,
  Info, RefreshCw, ShieldX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError, FunctionsFetchError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { AuthShell } from "@/components/auth/AuthShell";

type Step = "form" | "otp" | "success";
type DeliveryState = "idle" | "sending" | "retrying" | "sent" | "failed";

const BRAND = "#AD1E2A";

const makeCorrelationId = () =>
  crypto.randomUUID?.() ?? `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const verificationHintFor = (message: string, maxAttemptsReached?: boolean) => {
  const lower = message.toLowerCase();
  if (maxAttemptsReached) return "This code is locked now. Use Resend code to get a fresh OTP, then verify again.";
  if (lower.includes("incorrect code")) return "Please check the latest email and enter the newest 6-digit code.";
  if (lower.includes("expired")) return "This OTP has expired. Use Resend code to continue with the same email.";
  if (lower.includes("no verification pending")) return "Please go back, confirm your email address, and request a new OTP.";
  if (lower.includes("already exists")) return "This email already has an account. Try logging in, or use a different email.";
  return "Please retry once. If it fails again, contact support.";
};

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [sendError, setSendError] = useState<{ message: string; correlationId?: string } | null>(null);
  const [lastCorrelationId, setLastCorrelationId] = useState<string | null>(null);
  const [deliveryState, setDeliveryState] = useState<DeliveryState>("idle");
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);

  const inflightRef = useRef(false); // hard-lock against rapid clicks

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const requestOtp = async (opts?: { isResend?: boolean }) => {
    if (inflightRef.current) return false;
    inflightRef.current = true;
    const setSending = opts?.isResend ? setResending : setIsLoading;
    setSending(true);
    setOtpError(null);
    setVerifyHint(null);
    setSendError(null);
    setDeliveryState("sending");
    setDeliveryMessage(opts?.isResend ? "Sending a fresh OTP…" : "Sending verification email…");
    const correlationId = opts?.isResend && lastCorrelationId
      ? lastCorrelationId
      : makeCorrelationId();
    setLastCorrelationId(correlationId);
    const retryTimer = window.setTimeout(() => {
      setDeliveryState("retrying");
      setDeliveryMessage("Retrying email delivery…");
    }, 900);
    try {
      const { data, error } = await supabase.functions.invoke("send-signup-otp", {
        body: { email: email.trim(), password, fullName: fullName.trim(), correlationId },
        headers: { "x-correlation-id": correlationId },
      });

      // Extract real server error text when Supabase wraps it as a non-2xx
      let serverMsg: string | undefined;
      let retryAfter: number | undefined;
      let responseCorrelationId: string | undefined;
      if (error) {
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json();
            serverMsg = body?.error || body?.detail;
            responseCorrelationId = body?.correlationId;
            if (typeof body?.retryAfter === "number") retryAfter = body.retryAfter;
          } catch (_) {
            try { serverMsg = await error.context.text(); } catch (_) {}
          }
        } else if (error instanceof FunctionsFetchError) {
          serverMsg = "Network/CORS error reaching the OTP service. Please retry.";
        } else {
          serverMsg = error.message;
        }
      }

      const payload = (data as any) || {};
      const effectiveCorrelationId = payload?.correlationId || responseCorrelationId || correlationId;
      setLastCorrelationId(effectiveCorrelationId);
      if (error || payload?.error) {
        const msg = payload?.error || serverMsg || "Failed to send verification code.";
        const detail = payload?.detail ? ` (${payload.detail})` : "";
        const full = `${msg}${detail}`;
        if (typeof payload?.retryAfter === "number") setResendIn(payload.retryAfter);
        else if (typeof retryAfter === "number") setResendIn(retryAfter);
        setSendError({ message: full, correlationId: effectiveCorrelationId });
        setDeliveryState("failed");
        setDeliveryMessage(full);
        if (opts?.isResend) setOtpError(full);
        else toast({ title: "Sign Up Failed", description: full, variant: "destructive" });
        return false;
      }
      setOtp("");
      setAttemptsLeft(null);
      setMaxAttemptsReached(false);
      setResendIn(payload?.resendAvailableInSec ?? 60);
      setLastSentAt(payload?.sentAt ? new Date(payload.sentAt) : new Date());
      setSendError(null);
      const retryCount = typeof payload?.retryCount === "number" ? payload.retryCount : 0;
      setDeliveryState("sent");
      setDeliveryMessage(retryCount > 0 ? `Email delivered after ${retryCount} retry attempt${retryCount === 1 ? "" : "s"}.` : "Verification email sent successfully.");
      if (opts?.isResend) toast({ title: "New code sent", description: "Check your inbox." });
      else toast({ title: "Code sent", description: `We emailed a 6-digit code to ${email}.` });
      return true;
    } catch (err: any) {
      const msg = err?.message || "Something went wrong.";
      setSendError({ message: msg, correlationId });
      setDeliveryState("failed");
      setDeliveryMessage(msg);
      if (opts?.isResend) setOtpError(msg);
      else toast({ title: "Sign Up Failed", description: msg, variant: "destructive" });
      return false;
    } finally {
      window.clearTimeout(retryTimer);
      setSending(false);
      inflightRef.current = false;
    }
  };


  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    const ok = await requestOtp();
    if (ok) setStep("otp");
  };

  const handleResend = async () => {
    if (resendIn > 0 || resending || inflightRef.current) return;
    await requestOtp({ isResend: true });
  };

  const handleVerify = async (codeOverride?: string) => {
    if (maxAttemptsReached || inflightRef.current) return;
    const code = (codeOverride ?? otp).trim();
    if (code.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    inflightRef.current = true;
    setIsLoading(true);
    setOtpError(null);
    setVerifyHint(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-signup-otp", {
        body: { email: email.trim(), code, correlationId: lastCorrelationId },
        headers: lastCorrelationId ? { "x-correlation-id": lastCorrelationId } : undefined,
      });
      const payload = (data as any) || {};
      let serverMsg: string | undefined;
      let responseCorrelationId: string | undefined;
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          serverMsg = body?.error || body?.detail;
          responseCorrelationId = body?.correlationId;
          if (typeof body?.attemptsLeft === "number") payload.attemptsLeft = body.attemptsLeft;
          if (body?.maxAttemptsReached) payload.maxAttemptsReached = true;
        } catch (_) {
          try { serverMsg = await error.context.text(); } catch (_) {}
        }
      }
      if (responseCorrelationId) setLastCorrelationId(responseCorrelationId);
      if (error || payload?.error) {
        const msg = payload?.error || serverMsg || error?.message || "Verification failed.";
        setOtpError(msg);
        setVerifyHint(verificationHintFor(msg, payload?.maxAttemptsReached));
        if (typeof payload?.attemptsLeft === "number") setAttemptsLeft(payload.attemptsLeft);
        if (payload?.maxAttemptsReached) {
          setMaxAttemptsReached(true);
          setAttemptsLeft(0);
          setOtp("");
        }
        return;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInErr) {
        toast({ title: "Account created", description: "Please log in with your new account." });
        navigate("/login");
        return;
      }
      setStep("success");
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      const msg = err?.message || "Verification failed.";
      setOtpError(msg);
      setVerifyHint(verificationHintFor(msg));
    } finally {
      setIsLoading(false);
      inflightRef.current = false;
    }
  };

  const confirmChangeEmail = () => {
    setChangeEmailOpen(false);
    setStep("form");
    setOtp("");
    setOtpError(null);
    setVerifyHint(null);
    setAttemptsLeft(null);
    setMaxAttemptsReached(false);
    setResendIn(0);
    setLastSentAt(null);
    setDeliveryState("idle");
    setDeliveryMessage(null);
  };

  const lastSentLabel = lastSentAt ? lastSentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const resendDisabled = resendIn > 0 || resending || inflightRef.current;
  const otpDisabled = maxAttemptsReached || isLoading;
  const showDeliveryState = deliveryMessage && deliveryState !== "idle";

  return (
    <AuthShell mode="signup">
      <SEOHead title="Create Account" description="Create your Houskase account to start shopping premium everyday essentials." />
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" type="text" placeholder="Your name" className="pl-10 h-11"
                      value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" className="pl-10 h-11"
                      value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Password"
                      className="pl-10 pr-10 h-11" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Confirm password"
                      className="pl-10 pr-10 h-11" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>


              {sendError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-destructive break-words">{sendError.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {showDeliveryState && !sendError && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm" role="status" aria-live="polite">
                  <div className="flex items-start gap-2">
                    {(deliveryState === "sending" || deliveryState === "retrying") ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{deliveryMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-white hover:opacity-90" style={{ backgroundColor: BRAND }} disabled={isLoading}>
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code…</>) : "Send Verification Code"}
              </Button>

              <p className="hidden md:block text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/login" className="font-medium text-foreground hover:underline">Log in</Link>
              </p>
            </form>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setChangeEmailOpen(true)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Change email
              </button>
              {lastSentLabel && (
                <span className="text-xs text-muted-foreground">Last sent at {lastSentLabel}</span>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Verify your email</h2>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>. Expires in 10 minutes.
              </p>
            </div>

            {showDeliveryState && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm" role="status" aria-live="polite">
                <div className="flex items-start gap-2">
                  {(deliveryState === "sending" || deliveryState === "retrying") ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                  ) : deliveryState === "failed" ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{deliveryMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {maxAttemptsReached ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldX className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Too many incorrect attempts</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verification is locked for this code. Request a new code to continue — the previous code is now invalid.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleResend}
                  disabled={resendDisabled}
                  className="w-full h-11 text-white hover:opacity-90"
                  style={{ backgroundColor: BRAND }}
                >
                  {resending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>) :
                   resendIn > 0 ? (<><RefreshCw className="mr-2 h-4 w-4" /> Resend in {resendIn}s</>) :
                   (<><RefreshCw className="mr-2 h-4 w-4" /> Send new code</>)}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => { setOtp(v); setOtpError(null); if (v.length === 6) handleVerify(v); }}
                    disabled={otpDisabled}
                  >
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {otpError && (
                    <div className="text-center space-y-1">
                      <p className="text-sm text-destructive flex items-center justify-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> {otpError}
                      </p>
                      {verifyHint && (
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Hint: {verifyHint}
                        </p>
                      )}
                    </div>
                  )}
                  {attemptsLeft !== null && attemptsLeft > 0 && !otpError && (
                    <p className="text-xs text-muted-foreground">{attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left</p>
                  )}
                </div>

                <Button onClick={() => handleVerify()} className="w-full h-11 text-white hover:opacity-90" style={{ backgroundColor: BRAND }} disabled={otpDisabled || otp.length !== 6}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>) : "Verify & Create Account"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendDisabled}
                    className="font-medium text-foreground hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline inline-flex items-center gap-1"
                  >
                    {resending ? (<><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>) :
                     resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                </div>
              </>
            )}

            {/* Troubleshooting */}
            <div className="rounded-lg border bg-muted/30 text-sm">
              <button
                type="button"
                onClick={() => setShowTips((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <Info className="h-4 w-4" /> Email nahi mila?
                </span>
                <span className="text-xs text-muted-foreground">{showTips ? "Hide" : "Show tips"}</span>
              </button>
              {showTips && (
                <div className="px-4 pb-4 space-y-2 text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>Apna <b>Spam / Junk / Promotions</b> folder check karein.</li>
                    <li>Email address confirm karein — typo hone par "Change email" pe click karein.</li>
                    <li>Delivery mein 30–60 seconds lag sakte hain. Cooldown khatam hone par "Resend code" try karein.</li>
                    <li>Corporate ya school email server sometimes external mail block karta hai — personal Gmail/Outlook try karein.</li>
                    <li>Baar-baar fail ho raha hai? Ho sakta hai SMTP delivery issue ho — thoda ruk kar retry karein ya support se contact karein.</li>
                  </ul>
                  {lastSentLabel && (
                    <p className="text-xs pt-1">
                      Last request: <span className="font-mono">{lastSentAt?.toLocaleString()}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center py-8 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: BRAND }}>
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold">Account created!</h2>
            <p className="text-sm text-muted-foreground">Welcome to Houskase. Redirecting you now…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change email address?</AlertDialogTitle>
            <AlertDialogDescription>
              Going back will discard the current code sent to <b>{email}</b>. You'll need to request a new code for the updated email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangeEmail} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90">
              Yes, change email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthShell>
  );
}
