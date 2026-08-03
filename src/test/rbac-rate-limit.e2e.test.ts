/**
 * End-to-end RBAC + rate-limit tests against the live Data API.
 *
 * Anonymous coverage always runs (needs VITE_SUPABASE_URL / _PUBLISHABLE_KEY).
 * Signed-in coverage runs only when TEST_USER_EMAIL / TEST_USER_PASSWORD are
 * provided (CI secrets or a local .env.test). Without them those tests skip
 * instead of failing, so the suite stays green in environments with no
 * credentials.
 *
 * Set SKIP_NETWORK_TESTS=1 to skip everything.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

const networkOff = !url || !anonKey || process.env.SKIP_NETWORK_TESTS === "1";
const dAnon = networkOff ? describe.skip : describe;
const dAuth = networkOff || !email || !password ? describe.skip : describe;

const makeClient = () =>
  createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

dAnon("RBAC – anonymous callers", () => {
  const anon = makeClient();

  it("cannot execute the privileged role helper is_admin", async () => {
    const { error } = await anon.rpc("is_admin", { _user_id: FAKE_UUID });
    expect(error).not.toBeNull();
  });

  it("cannot execute is_super_admin", async () => {
    const { error } = await anon.rpc("is_super_admin");
    expect(error).not.toBeNull();
  });

  it("cannot enumerate users via list_users_with_roles", async () => {
    const { error } = await anon.rpc("list_users_with_roles");
    expect(error).not.toBeNull();
  });

  it("cannot read or decrypt signup OTP secrets", async () => {
    const { error } = await anon.rpc("signup_otp_get_password", {
      _email: "nobody@example.com",
      _key: "x",
    });
    expect(error).not.toBeNull();
  });

  it("cannot read the audit log", async () => {
    const { data, error } = await anon.from("audit_log").select("id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot read profiles of other users", async () => {
    const { data, error } = await anon.from("profiles").select("user_id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("can still read public storefront helpers (positive control)", async () => {
    const { error } = await anon.rpc("list_public_coupons", { _category_id: null });
    expect(error).toBeNull();
  });
});

dAnon("Rate limiting – anonymous callers", () => {
  const anon = makeClient();

  it("cannot call mcp_check_rate_limit at all", async () => {
    const { error } = await anon.rpc("mcp_check_rate_limit", {
      _user: FAKE_UUID,
      _tool: "initiate_checkout",
    });
    expect(error).not.toBeNull();
  });

  it("cannot read or write the mcp audit log used for quota accounting", async () => {
    const read = await anon.from("mcp_audit_log").select("id").limit(1);
    expect(!!read.error || (read.data ?? []).length === 0).toBe(true);

    const write = await anon
      .from("mcp_audit_log")
      .insert({ user_id: FAKE_UUID, tool_name: "initiate_checkout" });
    expect(write.error).not.toBeNull();
  });
});

dAuth("RBAC + rate limiting – signed-in non-admin user", () => {
  let client: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    client = makeClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    if (error) throw new Error(`test user sign-in failed: ${error.message}`);
    userId = data.user!.id;
  });

  it("can check its own rate-limit quota", async () => {
    const { data, error } = await client.rpc("mcp_check_rate_limit", {
      _user: userId,
      _tool: "initiate_checkout",
    });
    expect(error).toBeNull();
    expect(data).toHaveProperty("ok");
  });

  it("cannot probe another user's quota (spoofed _user is ignored)", async () => {
    const { data, error } = await client.rpc("mcp_check_rate_limit", {
      _user: FAKE_UUID,
      _tool: "initiate_checkout",
    });
    // The function forces auth.uid(); the spoofed id must not change the answer.
    expect(error).toBeNull();
    const own = await client.rpc("mcp_check_rate_limit", {
      _user: userId,
      _tool: "initiate_checkout",
    });
    expect(JSON.stringify(data)).toBe(JSON.stringify(own.data));
  });

  it("cannot escalate privileges by inserting a role", async () => {
    const { error } = await client
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    expect(error).not.toBeNull();
  });

  it("is not an admin", async () => {
    const { data, error } = await client.rpc("is_admin", { _user_id: userId });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("cannot read other users' orders", async () => {
    const { data, error } = await client.from("orders").select("user_id").limit(50);
    expect(error).toBeNull();
    for (const row of data ?? []) expect(row.user_id).toBe(userId);
  });

  it("cannot read the audit log", async () => {
    const { data, error } = await client.from("audit_log").select("id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot decrypt signup OTP secrets", async () => {
    const { error } = await client.rpc("signup_otp_get_password", {
      _email: email!,
      _key: "x",
    });
    expect(error).not.toBeNull();
  });
});
