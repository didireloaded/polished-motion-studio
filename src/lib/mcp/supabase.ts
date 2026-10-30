import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

const url = () => (process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"]) as string;
const key = () =>
  (process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string;

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requires a verified OAuth token");
  return createClient<Database>(url(), key(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
