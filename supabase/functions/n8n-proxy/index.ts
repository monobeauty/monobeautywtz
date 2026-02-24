import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dual auth: accept either x-api-key (n8n) or Supabase JWT (frontend)
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("N8N_API_KEY");
    const authHeader = req.headers.get("authorization");

    let authenticated = false;

    // Check n8n API key
    if (apiKey && apiKey === expectedKey) {
      authenticated = true;
    }

    // Check Supabase JWT (frontend calls)
    if (!authenticated && authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (!claimsError && claims?.claims?.sub) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, table, query, function_name, args } = await req.json();

    // RPC action doesn't need table validation
    if (action === "rpc") {
      const allowedFunctions = [
        "auto_create_bot_memoria",
        "reopen_chat_on_new_message",
        "update_chat_status_updated_at",
      ];
      if (!function_name || !allowedFunctions.includes(function_name)) {
        return new Response(
          JSON.stringify({ error: `Function not allowed. Allowed: ${allowedFunctions.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const result = await supabaseAdmin.rpc(function_name, args || {});
      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ data: result.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Whitelist of allowed tables
    const allowedTables = [
      "configuracoes_sistema",
      "chat_status",
      "messages",
      "bot_memoria",
      "setores_atendimento",
    ];

    if (!table || !allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table not allowed. Allowed: ${allowedTables.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service_role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      case "select": {
        let q = supabaseAdmin.from(table).select(query?.select || "*");
        if (query?.eq) {
          for (const [col, val] of Object.entries(query.eq)) {
            q = q.eq(col, val);
          }
        }
        if (query?.limit) q = q.limit(query.limit);
        if (query?.order) q = q.order(query.order.column, { ascending: query.order.ascending ?? true });
        result = await q;
        break;
      }

      case "insert": {
        if (!query?.data) {
          return new Response(
            JSON.stringify({ error: "Missing data for insert" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await supabaseAdmin.from(table).insert(query.data).select();
        break;
      }

      case "update": {
        if (!query?.data || !query?.eq) {
          return new Response(
            JSON.stringify({ error: "Missing data or eq filter for update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        let uq = supabaseAdmin.from(table).update(query.data);
        for (const [col, val] of Object.entries(query.eq)) {
          uq = uq.eq(col, val);
        }
        result = await uq.select();
        break;
      }

      case "delete": {
        if (!query?.eq) {
          return new Response(
            JSON.stringify({ error: "Missing eq filter for delete" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        let dq = supabaseAdmin.from(table).delete();
        for (const [col, val] of Object.entries(query.eq)) {
          dq = dq.eq(col, val);
        }
        result = await dq.select();
        break;
      }

      case "upsert": {
        if (!query?.data) {
          return new Response(
            JSON.stringify({ error: "Missing data for upsert" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const defaultConflict: Record<string, string> = {
          chat_status: "remote_jid",
          bot_memoria: "telefone",
        };
        const onConflict = query?.onConflict || defaultConflict[table] || "id";
        result = await supabaseAdmin.from(table).upsert(query.data, { onConflict }).select();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: select, insert, update, delete, upsert, rpc" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
