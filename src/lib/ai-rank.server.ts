import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const schema = z.object({
  recommendations: z.array(z.object({ ref: z.string(), reason: z.string() })),
});

export async function rankWithAi(apiKey: string, input: { me: unknown; candidates: unknown[] }) {
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(url, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    instructions:
      "You rank dating profiles for compatibility. Only use refs from the candidate list. Pick up to 5 best matches. " +
      "For each, give one short, specific reason (max 20 words) grounded in the shared details. Never invent facts.",
    prompt: JSON.stringify(input),
    output: Output.object({ schema }),
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
  });
  return await result.output;
}
