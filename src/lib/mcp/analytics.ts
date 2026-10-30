import { PostHogMCP } from "@posthog/mcp";
import type {
  ToolContext,
  ToolDefinition,
  ZodOutputSchema,
  ZodRawShape,
} from "@lovable.dev/mcp-js";

const token = process.env["POSTHOG_MCP_PROJECT_TOKEN"];
const host = process.env["POSTHOG_MCP_HOST"];
const analytics = token && host ? new PostHogMCP(token, { host }) : null;

/** The Lovable runtime owns the MCP server object, so capture at its existing tool boundary. */
export function trackTool<
  TInput extends ZodRawShape | undefined,
  TOutput extends ZodOutputSchema | undefined,
>(tool: ToolDefinition<TInput, TOutput>): ToolDefinition<TInput, TOutput> {
  if (!analytics) return tool;
  const handler = async (args: unknown, ctx: ToolContext) => {
    const started = Date.now();
    let isError = false;
    try {
      const original = tool.handler as (
        args: unknown,
        ctx: ToolContext,
      ) => ReturnType<typeof tool.handler>;
      const result = await original(args, ctx);
      isError = result.isError === true;
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      // Only metadata is sent. Dating profiles, post bodies, arguments and results stay private.
      analytics.captureToolCall({
        toolName: tool.name,
        toolDescription: tool.description,
        durationMs: Date.now() - started,
        isError,
        properties: { $mcp_server_name: "motion-polish-playground" },
      });
      try {
        // captureToolCall queues its event asynchronously; let it reach posthog-node first.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        // Cloudflare workers do not reliably run SIGTERM; flush this invocation.
        await analytics.flush();
      } catch {
        // Analytics must not change a tool's result.
      }
    }
  };
  return {
    ...tool,
    // The wrapper preserves the exact two arguments; only TS's conditional input type is erased.
    handler: handler as unknown as ToolDefinition<TInput, TOutput>["handler"],
  };
}
