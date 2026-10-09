import { requireSupabase } from "./supabase.js";

export async function getPublicContent(table, options = {}) {
  const client = requireSupabase();
  let query = client.from(table).select("*");
  if (table === "cv_settings") {
    query = query.eq("is_active", true).eq("button_enabled", true);
  } else if (table === "site_settings") {
    query = query.eq("published", true).eq("is_public", true);
  } else if (table !== "profiles") {
    query = query.eq("published", true);
  }
  if (table === "educations") {
    query = query.order("sort_order", { ascending: true }).order("start_date", { ascending: false, nullsFirst: false });
  } else if (table !== "cv_settings") {
    query = query.order(options.orderBy || "sort_order", { ascending: true });
  }
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAdminContent(table) {
  const client = requireSupabase();
  let query = client.from(table).select("*");
  if (table === "contact_messages") query = query.order("created_at", { ascending: false });
  else if (table === "educations") query = query.order("sort_order", { ascending: true }).order("start_date", { ascending: false, nullsFirst: false });
  else if (table === "cv_settings") query = query.order("updated_at", { ascending: false });
  else query = query.order("updated_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function localized(value, language, fallback = "") {
  if (value && typeof value === "object") return value[language] || value.id || value.en || fallback;
  return value || fallback;
}

export function formatDate(value, language, options = { year: "numeric", month: "short" }) {
  if (!value) return "";
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", options).format(new Date(value));
}
