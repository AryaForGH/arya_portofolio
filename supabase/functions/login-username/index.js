import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("PORTFOLIO_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { username, password } = await request.json();
    if (typeof username !== "string" || typeof password !== "string" ||
        username.length < 3 || username.length > 40 || password.length < 1 || password.length > 256) {
      return json({ error: "Invalid username or password" }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!url || !serviceKey || !anonKey || !salt) throw new Error("Missing function environment configuration");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${address}`));
    const ipHash = `login:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    const { data: allowed, error: limitError } = await admin.rpc("consume_contact_rate_limit", { p_ip_hash: ipHash });
    if (limitError) throw limitError;
    if (!allowed) return json({ error: "Too many attempts. Try again later." }, 429);
    const { data: account, error: mappingError } = await admin
      .from("admin_accounts").select("user_id").eq("username", username).maybeSingle();
    if (mappingError || !account) return json({ error: "Invalid username or password" }, 401);
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(account.user_id);
    const email = userData.user?.email;
    if (userError || !email || userData.user?.app_metadata?.role !== "admin") {
      return json({ error: "Invalid username or password" }, 401);
    }
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session || data.user.app_metadata?.role !== "admin") {
      return json({ error: "Invalid username or password" }, 401);
    }
    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error("Username login failed", error);
    return json({ error: "Unable to sign in" }, 500);
  }
});
