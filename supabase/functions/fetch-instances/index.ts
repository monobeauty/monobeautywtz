import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");

    if (!apiKey || !apiUrl) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
    });

    const data = await response.json();

    console.log("Raw Evolution API response (first item):", JSON.stringify(data?.[0] || {}).slice(0, 2000));

    // Extract instance names and status from the response
    const instances: { name: string; status: string; profilePicUrl: string | null; profileName: string | null }[] = [];
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const name = item.instance?.instanceName || item.instanceName || item.name;
        const status = item.connectionStatus || item.instance?.status || item.state || item.status || "unknown";
        // Check multiple possible paths for profile picture
        const profilePicUrl = item.instance?.profilePictureUrl 
          || item.profilePictureUrl 
          || item.instance?.profilePicUrl
          || item.profilePicUrl
          || item.instance?.owner?.profilePictureUrl
          || item.setting?.profilePicUrl
          || null;
        const profileName = item.instance?.profileName 
          || item.profileName 
          || item.instance?.owner?.pushName
          || item.instance?.owner?.profileName
          || null;
        if (name) instances.push({ name, status: String(status).toLowerCase(), profilePicUrl, profileName });
      });
    }

    return new Response(JSON.stringify({ instances }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
