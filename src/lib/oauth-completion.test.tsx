import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigate, signIn } = vi.hoisted(() => ({
  navigate: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: signIn } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

import { Route } from "@/routes/auth";

const AuthPage = Route.options.component as ComponentType;

describe("OAuth completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/auth");
  });

  it.each(["Google", "Apple"])(
    "leaves sign-in after successful %s popup authentication",
    async (provider) => {
      signIn.mockResolvedValue({ error: null, redirected: false });
      render(<AuthPage />);
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`Sign in with ${provider}`) }));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/you" }));
    },
  );

  it("shows a session failure without navigating", async () => {
    signIn.mockResolvedValue({ error: new Error("Session could not be saved") });
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: /Sign in with Google/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("Session could not be saved");
    expect(navigate).not.toHaveBeenCalled();
  });
});
