import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(data)}`);
  return data;
}

async function getValidToken(userId: string): Promise<string> {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: tokenRow } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!tokenRow) throw new Error("Google Calendar not connected");

  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  if (expiresAt > new Date(now.getTime() + 60000)) {
    return tokenRow.access_token;
  }

  if (!tokenRow.refresh_token) throw new Error("No refresh token available");

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabaseAdmin.from("google_calendar_tokens").update({
    access_token: refreshed.access_token,
    expires_at: newExpiry,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const accessToken = await getValidToken(userId);
    const calendarId = "primary";
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    const gHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // LIST events
    if (req.method === "GET" && action === "list") {
      const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
      const timeMax = url.searchParams.get("timeMax");
      let gUrl = `${baseUrl}?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=250`;
      if (timeMax) gUrl += `&timeMax=${encodeURIComponent(timeMax)}`;

      const res = await fetch(gUrl, { headers: gHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(`Google API error [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // CREATE event
    if (req.method === "POST" && action === "create") {
      const body = await req.json();
      const event = {
        summary: body.title,
        description: body.description || "",
        location: body.location || "",
        start: body.all_day
          ? { date: body.start_date }
          : { dateTime: body.start_at, timeZone: body.timezone || "America/Sao_Paulo" },
        end: body.all_day
          ? { date: body.end_date }
          : { dateTime: body.end_at, timeZone: body.timezone || "America/Sao_Paulo" },
      };

      const res = await fetch(baseUrl, { method: "POST", headers: gHeaders, body: JSON.stringify(event) });
      const data = await res.json();
      if (!res.ok) throw new Error(`Google API error [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // UPDATE event
    if (req.method === "PUT" && action === "update") {
      const eventId = url.searchParams.get("eventId");
      if (!eventId) return new Response(JSON.stringify({ error: "eventId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const body = await req.json();
      const event = {
        summary: body.title,
        description: body.description || "",
        location: body.location || "",
        start: body.all_day
          ? { date: body.start_date }
          : { dateTime: body.start_at, timeZone: body.timezone || "America/Sao_Paulo" },
        end: body.all_day
          ? { date: body.end_date }
          : { dateTime: body.end_at, timeZone: body.timezone || "America/Sao_Paulo" },
      };

      const res = await fetch(`${baseUrl}/${eventId}`, { method: "PUT", headers: gHeaders, body: JSON.stringify(event) });
      const data = await res.json();
      if (!res.ok) throw new Error(`Google API error [${res.status}]: ${JSON.stringify(data)}`);

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DELETE event
    if (req.method === "DELETE" && action === "delete") {
      const eventId = url.searchParams.get("eventId");
      if (!eventId) return new Response(JSON.stringify({ error: "eventId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const res = await fetch(`${baseUrl}/${eventId}`, { method: "DELETE", headers: gHeaders });
      if (!res.ok && res.status !== 204) {
        const data = await res.text();
        throw new Error(`Google API error [${res.status}]: ${data}`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // CHECK connection status
    if (req.method === "GET" && action === "status") {
      return new Response(JSON.stringify({ connected: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err.message || "Unknown error";
    const isNotConnected = msg.includes("not connected");
    return new Response(JSON.stringify({ error: msg, connected: !isNotConnected }), {
      status: isNotConnected ? 404 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
