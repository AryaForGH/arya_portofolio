import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.js";

const respond = (request, message, status) => new Response(JSON.stringify({ message }), {
  status, headers: { ...getCorsHeaders(request), "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return respond(request, "Method not allowed", 405);
  try {
    const { name, email, message, language, website } = await request.json();
    if (typeof website === "string" && website.trim()) return respond(request, "Message received", 200);
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100 ||
        typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof message !== "string" || message.trim().length < 1 || message.trim().length > 5000 ||
        !["id", "en"].includes(language)) return respond(request, "Invalid message", 400);

    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") || "unknown";
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!salt) throw new Error("RATE_LIMIT_SALT is not configured");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${address}`));
    const ipHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Missing function environment configuration");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: limitError } = await admin.rpc("consume_contact_rate_limit", { p_ip_hash: ipHash });
    if (limitError) throw limitError;
    if (!allowed) return respond(request, "Too many messages. Please try again later.", 429);
    const { error } = await admin.from("contact_messages").insert({
      name: name.trim(), email: email.trim(), message: message.trim(), language,
    });
    if (error) throw error;
    return respond(request, "Message received", 201);
  } catch (error) {
    console.error("Contact form submission failed", error);
    return respond(request, "Unable to submit message", 500);
  }
});
