import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "create") {
      const { email, password, full_name, role } = await Promise.resolve(
        (await req.clone().json()) as {
          action: string;
          email: string;
          password: string;
          full_name: string;
          role: "admin" | "atendente";
        }
      );

      // Reparse body
      const body = JSON.parse(await req.clone().text());

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = newUser.user.id;

      // Assign role
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: body.role,
      });

      // Create attendant profile
      await supabaseAdmin.from("attendant_profiles").insert({
        user_id: userId,
        full_name: body.full_name,
        email: body.email,
        status: "offline",
      });

      return new Response(
        JSON.stringify({ ok: true, user_id: userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      // Get all user_roles with attendant_profiles
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role, created_at");

      const { data: profiles } = await supabaseAdmin
        .from("attendant_profiles")
        .select("user_id, full_name, email, status, avatar_url");

      // Get auth users for last sign in
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();

      const userMap = new Map<string, any>();

      for (const r of roles || []) {
        userMap.set(r.user_id, { ...userMap.get(r.user_id), role: r.role, user_id: r.user_id });
      }

      for (const p of profiles || []) {
        const existing = userMap.get(p.user_id) || { user_id: p.user_id };
        userMap.set(p.user_id, { ...existing, ...p });
      }

      for (const u of authUsers || []) {
        const existing = userMap.get(u.id);
        if (existing) {
          userMap.set(u.id, {
            ...existing,
            email: existing.email || u.email,
            full_name: existing.full_name || u.user_metadata?.full_name || u.email,
            last_sign_in_at: u.last_sign_in_at,
          });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, users: Array.from(userMap.values()) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
