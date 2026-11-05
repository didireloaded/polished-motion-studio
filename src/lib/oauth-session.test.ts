import { beforeEach, expect, it, vi } from "vitest";

const { startOAuth, setSession } = vi.hoisted(() => ({
  startOAuth: vi.fn(),
  setSession: vi.fn(),
}));
vi.mock("@lovable.dev/cloud-auth-js", () => ({
  createLovableAuth: () => ({ signInWithOAuth: startOAuth }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { setSession } } }));

import { lovable } from "@/integrations/lovable";

beforeEach(() => vi.clearAllMocks());

it("returns a session failure instead of reporting a completed popup login", async () => {
  const tokens = { access_token: "test-access", refresh_token: "test-refresh" };
  const error = new Error("Session could not be saved");
  startOAuth.mockResolvedValue({ tokens, error: null });
  setSession.mockResolvedValue({ error });
  expect(await lovable.auth.signInWithOAuth("google")).toEqual({ error });
  expect(setSession).toHaveBeenCalledWith(tokens);
});
