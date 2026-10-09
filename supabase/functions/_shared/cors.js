const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function getCorsHeaders(request) {
  const requestOrigin = request.headers.get("origin") || "";
  const configuredOrigins = (Deno.env.get("PORTFOLIO_ORIGIN") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  let isLocalOrigin = false;

  try {
    const parsedOrigin = new URL(requestOrigin);
    isLocalOrigin = parsedOrigin.protocol === "http:" && localHosts.has(parsedOrigin.hostname);
  } catch {
    isLocalOrigin = false;
  }

  const allowedOrigin = configuredOrigins.includes(requestOrigin) || isLocalOrigin
    ? requestOrigin
    : configuredOrigins[0] || "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
