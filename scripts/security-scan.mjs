#!/usr/bin/env node
/**
 * Automated security scan for CI.
 *
 * Probes the live Data API as an anonymous caller and fails the build if any
 * sensitive table or privileged function is reachable without auth.
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from the env or .env.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("security-scan: missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const anon = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

/** Tables that must never expose rows to an anonymous caller. */
const PRIVATE_TABLES = [
  "orders",
  "order_items",
  "rfq_requests",
  "rfq_items",
  "rfq_cart_items",
  "user_roles",
  "profiles",
  "audit_log",
  "mcp_audit_log",
  "signup_otps",
];

/** Functions that must reject anonymous execution. */
const PRIVATE_RPCS = [
  ["is_admin", { _user_id: FAKE_UUID }],
  ["is_super_admin", {}],
  ["list_users_with_roles", {}],
  ["mcp_check_rate_limit", { _user: FAKE_UUID, _tool: "initiate_checkout" }],
  ["signup_otp_get_password", { _email: "nobody@example.com", _key: "x" }],
];

/** Public surface that must keep working (guards against over-locking). */
const PUBLIC_TABLES = ["products", "categories", "hero_slides", "site_settings"];

const failures = [];
const checks = [];

for (const table of PRIVATE_TABLES) {
  const { data, error } = await anon.from(table).select("*").limit(1);
  const leaked = !error && (data ?? []).length > 0;
  checks.push(`${leaked ? "FAIL" : "ok  "} anon read ${table}`);
  if (leaked) failures.push(`Anonymous caller can read rows from "${table}"`);
}

for (const [fn, args] of PRIVATE_RPCS) {
  const { error } = await anon.rpc(fn, args);
  const allowed = !error;
  checks.push(`${allowed ? "FAIL" : "ok  "} anon rpc ${fn}`);
  if (allowed) failures.push(`Anonymous caller can execute "${fn}()"`);
}

{
  const { error } = await anon.from("user_roles").insert({ user_id: FAKE_UUID, role: "admin" });
  const allowed = !error;
  checks.push(`${allowed ? "FAIL" : "ok  "} anon insert user_roles`);
  if (allowed) failures.push("Anonymous caller can insert into user_roles (privilege escalation)");
}

for (const table of PUBLIC_TABLES) {
  const { error } = await anon.from(table).select("*").limit(1);
  checks.push(`${error ? "FAIL" : "ok  "} public read ${table}`);
  if (error) failures.push(`Public table "${table}" is unreadable: ${error.message}`);
}

console.log(checks.join("\n"));

if (failures.length) {
  console.error(`\nsecurity-scan: ${failures.length} issue(s) found:`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nsecurity-scan: all ${checks.length} checks passed.`);
