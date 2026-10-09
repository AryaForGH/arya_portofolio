import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.js";
const json = (body, status = 200, request) => new Response(JSON.stringify(body), {
  status, headers: { ...getCorsHeaders(request), "Content-Type": "application/json" },
});
const fail = (code, status, request) => json({ error: code, code }, status, request);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);
  try {
    const { username, password } = await request.json();
    if (typeof username !== "string" || typeof password !== "string" ||
        username.length < 3 || username.length > 40 || password.length < 1 || password.length > 256) {
      return fail("INVALID_CREDENTIALS", 400, request);
    }
    const normalizedUsername = username.trim();
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(normalizedUsername)) return fail("INVALID_CREDENTIALS", 400, request);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!url || !serviceKey || !anonKey || !salt) {
      console.error("Username login is missing required Supabase function configuration.");
      return fail("LOGIN_CONFIGURATION_ERROR", 503, request);
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${address}`));
    const ipHash = `login:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    const { data: allowed, error: limitError } = await admin.rpc("consume_contact_rate_limit", { p_ip_hash: ipHash });
    if (limitError) {
      console.error("Username login rate limiter failed:", limitError.message);
      return fail("LOGIN_SERVICE_ERROR", 503, request);
    }
    if (!allowed) return fail("LOGIN_RATE_LIMITED", 429, request);
    const { data: account, error: mappingError } = await admin
      .from("admin_accounts").select("user_id").eq("username", normalizedUsername).maybeSingle();
    if (mappingError) {
      console.error("Username login account lookup failed:", mappingError.message);
      return fail("LOGIN_SERVICE_ERROR", 503, request);
    }
    if (!account) return fail("INVALID_CREDENTIALS", 401, request);
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(account.user_id);
    const email = userData.user?.email;
    if (userError) {
      console.error("Username login could not load the mapped Auth user:", userError.message);
      return fail("LOGIN_SERVICE_ERROR", 503, request);
    }
    if (!email || userData.user?.app_metadata?.role !== "admin") return fail("INVALID_CREDENTIALS", 401, request);
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
        return fail("INVALID_CREDENTIALS", 401, request);
      }
      if (error.status === 429) return fail("LOGIN_RATE_LIMITED", 429, request);
      console.error("Username login Auth request failed:", error.message);
      return fail("LOGIN_SERVICE_ERROR", 503, request);
    }
    if (!data.session || data.user.app_metadata?.role !== "admin") return fail("INVALID_CREDENTIALS", 401, request);
    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    }, 200, request);
  } catch (error) {
    console.error("Username login request failed:", error instanceof Error ? error.message : "Unknown error");
    return fail("LOGIN_SERVICE_ERROR", 503, request);
  }
});
