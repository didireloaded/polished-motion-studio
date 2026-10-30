import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Read the signed-in member's Mutal profile.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("display_name, age, town, bio, intent, seeking, tags")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error) throw new ToolError("Couldn't load your profile.");
    if (!data) return { content: [{ type: "text", text: "You haven't created a profile yet." }] };
    return {
      content: [
        { type: "text", text: `${data.display_name}, ${data.age}, ${data.town}. ${data.bio}` },
      ],
      structuredContent: { profile: { ...data, tags: [...data.tags] } },
    };
  },
});
