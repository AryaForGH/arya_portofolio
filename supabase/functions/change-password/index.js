import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("PORTFOLIO_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || password.length < 10 || password.length > 256) {
      return respond({ error: "Password must contain at least 10 characters" }, 400);
    }
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return respond({ error: "Authentication required" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) throw new Error("Missing function environment configuration");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userResult, error: userError } = await admin.auth.getUser(token);
    const user = userResult.user;
    if (userError || !user || user.app_metadata?.role !== "admin" || user.app_metadata?.must_change_password !== true || !user.email) {
      return respond({ error: "Password update is not permitted" }, 403);
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: { ...user.app_metadata, must_change_password: false },
    });
    if (updateError) throw updateError;
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: user.email, password });
    if (error || !data.session) throw error || new Error("Could not create updated session");
    return respond({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error("Initial password update failed", error);
    return respond({ error: "Unable to update the password" }, 500);
  }
});
