import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  action: string;
  [key: string]: any;
}

// Database connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!databaseUrl) {
      throw new Error("SUPABASE_DB_URL not configured");
    }
    pool = new Pool(databaseUrl, 3, true);
  }
  return pool;
}

async function query(sql: string, params: any[] = []) {
  const pool = getPool();
  const connection = await pool.connect();
  try {
    const result = await connection.queryObject(sql, params);
    return result.rows;
  } finally {
    connection.release();
  }
}

async function queryOne(sql: string, params: any[] = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Verify admin role
async function verifyAdmin(supabase: any, authHeader: string): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return false;
  }

  // Check user_roles table (current app system)
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (userRole?.role === "admin") {
    return true;
  }

  // Fallback: check admin_users table (legacy)
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return adminUser?.role === "admin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify authorization
    const authHeader = req.headers.get("authorization") || "";
    const isAdmin = await verifyAdmin(supabase, authHeader);
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { action } = body;

    let result: any;

    switch (action) {
      // === FLOWS ===
      case "listFlows":
        result = await query(
          `SELECT * FROM chatbot_flows ORDER BY created_at DESC`
        );
        break;

      case "createFlow":
        result = await queryOne(
          `INSERT INTO chatbot_flows (name, description, channel, is_active, is_default)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            body.name || "Novo Fluxo",
            body.description || null,
            body.channel || "all",
            body.is_active ?? true,
            body.is_default ?? false,
          ]
        );
        break;

      case "updateFlow":
        const flowUpdates: string[] = [];
        const flowParams: any[] = [];
        let flowParamIndex = 1;

        if (body.name !== undefined) {
          flowUpdates.push(`name = $${flowParamIndex++}`);
          flowParams.push(body.name);
        }
        if (body.description !== undefined) {
          flowUpdates.push(`description = $${flowParamIndex++}`);
          flowParams.push(body.description);
        }
        if (body.channel !== undefined) {
          flowUpdates.push(`channel = $${flowParamIndex++}`);
          flowParams.push(body.channel);
        }
        if (body.is_active !== undefined) {
          flowUpdates.push(`is_active = $${flowParamIndex++}`);
          flowParams.push(body.is_active);
        }
        if (body.is_default !== undefined) {
          flowUpdates.push(`is_default = $${flowParamIndex++}`);
          flowParams.push(body.is_default);
        }

        flowUpdates.push(`updated_at = NOW()`);
        flowParams.push(body.id);

        result = await queryOne(
          `UPDATE chatbot_flows SET ${flowUpdates.join(", ")} WHERE id = $${flowParamIndex} RETURNING *`,
          flowParams
        );
        break;

      case "deleteFlow":
        await query(`DELETE FROM chatbot_flows WHERE id = $1`, [body.id]);
        result = { deleted: true };
        break;

      // === NODES ===
      case "listNodes":
        result = await query(
          `SELECT * FROM chatbot_nodes WHERE flow_id = $1 ORDER BY node_order ASC`,
          [body.flowId]
        );
        break;

      case "createNode":
        result = await queryOne(
          `INSERT INTO chatbot_nodes (flow_id, node_type, name, content, options, action_type, action_config, next_node_id, node_order, is_entry_point, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            body.flow_id,
            body.node_type || "message",
            body.name || "Novo Nó",
            body.content || null,
            body.options ? JSON.stringify(body.options) : null,
            body.action_type || "none",
            body.action_config ? JSON.stringify(body.action_config) : null,
            body.next_node_id || null,
            body.node_order ?? 0,
            body.is_entry_point ?? false,
            body.is_active ?? true,
          ]
        );
        break;

      case "updateNode":
        const nodeUpdates: string[] = [];
        const nodeParams: any[] = [];
        let nodeParamIndex = 1;

        if (body.node_type !== undefined) {
          nodeUpdates.push(`node_type = $${nodeParamIndex++}`);
          nodeParams.push(body.node_type);
        }
        if (body.name !== undefined) {
          nodeUpdates.push(`name = $${nodeParamIndex++}`);
          nodeParams.push(body.name);
        }
        if (body.content !== undefined) {
          nodeUpdates.push(`content = $${nodeParamIndex++}`);
          nodeParams.push(body.content);
        }
        if (body.options !== undefined) {
          nodeUpdates.push(`options = $${nodeParamIndex++}`);
          nodeParams.push(body.options ? JSON.stringify(body.options) : null);
        }
        if (body.action_type !== undefined) {
          nodeUpdates.push(`action_type = $${nodeParamIndex++}`);
          nodeParams.push(body.action_type);
        }
        if (body.action_config !== undefined) {
          nodeUpdates.push(`action_config = $${nodeParamIndex++}`);
          nodeParams.push(body.action_config ? JSON.stringify(body.action_config) : null);
        }
        if (body.next_node_id !== undefined) {
          nodeUpdates.push(`next_node_id = $${nodeParamIndex++}`);
          nodeParams.push(body.next_node_id);
        }
        if (body.node_order !== undefined) {
          nodeUpdates.push(`node_order = $${nodeParamIndex++}`);
          nodeParams.push(body.node_order);
        }
        if (body.is_entry_point !== undefined) {
          nodeUpdates.push(`is_entry_point = $${nodeParamIndex++}`);
          nodeParams.push(body.is_entry_point);
        }
        if (body.is_active !== undefined) {
          nodeUpdates.push(`is_active = $${nodeParamIndex++}`);
          nodeParams.push(body.is_active);
        }

        nodeUpdates.push(`updated_at = NOW()`);
        nodeParams.push(body.id);

        result = await queryOne(
          `UPDATE chatbot_nodes SET ${nodeUpdates.join(", ")} WHERE id = $${nodeParamIndex} RETURNING *`,
          nodeParams
        );
        break;

      case "deleteNode":
        await query(`DELETE FROM chatbot_nodes WHERE id = $1`, [body.id]);
        result = { deleted: true };
        break;

      case "bulkUpdateNodeOrder":
        for (const node of body.nodes || []) {
          await query(
            `UPDATE chatbot_nodes SET node_order = $1 WHERE id = $2`,
            [node.node_order, node.id]
          );
        }
        result = { updated: true };
        break;

      // === NODE OPTIONS ===
      case "listNodeOptions":
        result = await query(
          `SELECT * FROM chatbot_node_options WHERE node_id = $1 ORDER BY option_order ASC`,
          [body.nodeId]
        );
        break;

      case "createNodeOption":
        result = await queryOne(
          `INSERT INTO chatbot_node_options (node_id, option_key, option_text, next_node_id, option_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            body.node_id,
            body.option_key || "1",
            body.option_text || "Nova Opção",
            body.next_node_id || null,
            body.option_order ?? 0,
          ]
        );
        break;

      case "updateNodeOption":
        const optionUpdates: string[] = [];
        const optionParams: any[] = [];
        let optionParamIndex = 1;

        if (body.option_key !== undefined) {
          optionUpdates.push(`option_key = $${optionParamIndex++}`);
          optionParams.push(body.option_key);
        }
        if (body.option_text !== undefined) {
          optionUpdates.push(`option_text = $${optionParamIndex++}`);
          optionParams.push(body.option_text);
        }
        if (body.next_node_id !== undefined) {
          optionUpdates.push(`next_node_id = $${optionParamIndex++}`);
          optionParams.push(body.next_node_id);
        }
        if (body.option_order !== undefined) {
          optionUpdates.push(`option_order = $${optionParamIndex++}`);
          optionParams.push(body.option_order);
        }

        optionParams.push(body.id);

        result = await queryOne(
          `UPDATE chatbot_node_options SET ${optionUpdates.join(", ")} WHERE id = $${optionParamIndex} RETURNING *`,
          optionParams
        );
        break;

      case "deleteNodeOption":
        await query(`DELETE FROM chatbot_node_options WHERE id = $1`, [body.id]);
        result = { deleted: true };
        break;

      default:
        return new Response(
          JSON.stringify({ ok: false, error: `Unknown action: ${action}`, code: "UNKNOWN_ACTION" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ ok: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chatbot admin error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message, code: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
