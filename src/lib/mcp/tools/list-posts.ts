import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_posts",
  title: "List community posts",
  description: "List recent community posts, optionally filtered by town.",
  inputSchema: {
    town: z.string().min(1).optional().describe("Only show posts from this town."),
    limit: z.number().int().min(1).max(50).optional().describe("How many posts (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ town, limit }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("posts")
      .select("id, author_name, town, body, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (town) q = q.eq("town", town);
    const { data, error } = await q;
    if (error) throw new ToolError("Couldn't load posts.");
    const posts = data ?? [];
    const text = posts.length
      ? posts.map((p) => `${p.author_name} (${p.town}): ${p.body}`).join("\n")
      : "No posts found.";
    return { content: [{ type: "text", text }], structuredContent: { posts } };
  },
});
