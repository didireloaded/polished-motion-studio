import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_matches",
  title: "List my matches",
  description: "List the signed-in member's matches with names and when they matched.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const db = supabaseForUser(ctx);
    const me = ctx.getUserId()!;
    const { data, error } = await db.from("matches").select("id, user_a, user_b, created_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw new ToolError("Couldn't load your matches.");
    const otherIds = (data ?? []).map((m) => (m.user_a === me ? m.user_b : m.user_a));
    const { data: people } = otherIds.length
      ? await db.from("profiles").select("id, display_name, town").in("id", otherIds)
      : { data: [] };
    const byId = new Map((people ?? []).map((p) => [p.id, p]));
    const matches = (data ?? []).map((m) => {
      const other = byId.get(m.user_a === me ? m.user_b : m.user_a);
      return { match_id: m.id, name: other?.display_name ?? "Member", town: other?.town ?? "", matched_at: m.created_at };
    });
    const text = matches.length ? matches.map((m) => `${m.name} (${m.town}) — ${m.matched_at}`).join("\n") : "No matches yet.";
    return { content: [{ type: "text", text }], structuredContent: { matches } };
  },
});
