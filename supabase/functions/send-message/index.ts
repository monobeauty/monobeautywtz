import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { instance_name, number, text, media_base64, media_mimetype, media_filename, media_type } = await req.json();

    if (!instance_name || !number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: instance_name, number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");

    if (!apiKey || !apiUrl) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let response: Response;

    if (media_base64 && media_type) {
      // Determine Evolution API media type
      let mediatype = "image";
      if (media_type === "document") mediatype = "document";
      if (media_type === "audio") mediatype = "audio";

      // Audio uses sendWhatsAppAudio endpoint for proper ptt rendering
      const isAudio = media_type === "audio";
      const endpoint = isAudio
        ? `${apiUrl}/message/sendWhatsAppAudio/${instance_name}`
        : `${apiUrl}/message/sendMedia/${instance_name}`;

      const mediaBody: Record<string, any> = isAudio
        ? {
            number,
            audio: `data:${media_mimetype};base64,${media_base64}`,
            options: { delay: 1200, presence: "recording" },
          }
        : {
            number,
            mediatype,
            media: `data:${media_mimetype};base64,${media_base64}`,
            fileName: media_filename || "file",
            options: { delay: 1200, presence: "composing" },
          };

      if (text && !isAudio) {
        mediaBody.caption = text;
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify(mediaBody),
      });
    } else if (text) {
      // Send text message
      response = await fetch(`${apiUrl}/message/sendText/${instance_name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          number,
          text,
          options: {
            delay: 1200,
            presence: "composing",
          },
        }),
      });
    } else {
      return new Response(
        JSON.stringify({ error: "No content to send" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.text();

    // Insert message into database after successful send
    if (response.ok) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const parsed = JSON.parse(data);
        const whatsappId = parsed?.key?.id || null;

        await supabaseClient.from("messages").insert({
          instance_name,
          remote_jid: `${number}@s.whatsapp.net`,
          message_text: text || null,
          is_from_me: true,
          whatsapp_id: whatsappId,
          status: "sent",
          push_name: instance_name,
        });
      } catch (dbErr) {
        console.error("Failed to insert message into DB:", dbErr);
      }
    }

    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
