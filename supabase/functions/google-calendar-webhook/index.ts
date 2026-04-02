import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

// Google Calendar push notification receiver (future use)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Google sends POST with X-Goog-Channel-ID and X-Goog-Resource-State
  const channelId = req.headers.get("X-Goog-Channel-ID");
  const resourceState = req.headers.get("X-Goog-Resource-State");

  console.log("Google Calendar webhook received:", { channelId, resourceState });

  // For now just acknowledge — full push sync can be added later
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
