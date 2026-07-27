import { z } from "zod";

// ==========================================
// Rate Limiter for client-side brute force protection
// ==========================================
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
  blockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  blockDurationMs: number = 30 * 60 * 1000 // 30 minutes block
): { allowed: boolean; remainingAttempts: number; blockedUntil?: Date } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (entry) {
    // Check if currently blocked
    if (entry.blocked && now < entry.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: new Date(entry.blockedUntil),
      };
    }

    // Reset if block expired or window expired
    if (entry.blocked && now >= entry.blockedUntil) {
      rateLimitStore.delete(key);
      return { allowed: true, remainingAttempts: maxAttempts };
    }

    // Check if within time window
    if (now - entry.firstAttempt < windowMs) {
      if (entry.count >= maxAttempts) {
        // Block the user
        entry.blocked = true;
        entry.blockedUntil = now + blockDurationMs;
        rateLimitStore.set(key, entry);
        return {
          allowed: false,
          remainingAttempts: 0,
          blockedUntil: new Date(entry.blockedUntil),
        };
      }
      entry.count++;
      rateLimitStore.set(key, entry);
      return { allowed: true, remainingAttempts: maxAttempts - entry.count };
    }

    // Window expired, reset
    rateLimitStore.set(key, { count: 1, firstAttempt: now, blocked: false, blockedUntil: 0 });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // First attempt
  rateLimitStore.set(key, { count: 1, firstAttempt: now, blocked: false, blockedUntil: 0 });
  return { allowed: true, remainingAttempts: maxAttempts - 1 };
}

export function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
}

// ==========================================
// Input Sanitization
// ==========================================
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/\\/g, "&#x5C;")
    .trim();
}

export function sanitizeHtml(html: string): string {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

// ==========================================
// Validation Schemas
// ==========================================
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email too long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long"),
});

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s\u0900-\u097F]+$/, "Name contains invalid characters"),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(10).max(2000),
});

// ==========================================
// Honeypot field check (anti-bot)
// ==========================================
export function isBot(honeypotValue: string | null | undefined): boolean {
  return !!honeypotValue && honeypotValue.length > 0;
}

// ==========================================
// CSRF Token generation (simple client-side)
// ==========================================
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
