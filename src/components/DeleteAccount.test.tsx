import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";

const { status, remove } = vi.hoisted(() => ({ status: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/account-deletion.functions", () => ({
  getAccountDeletionStatus: status,
  deleteMyAccount: remove,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn() } } }));

import { DeleteAccount } from "./DeleteAccount";

beforeEach(() => {
  vi.clearAllMocks();
  status.mockResolvedValue({ available: true, requiresSignIn: false });
});

function showSettings() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DeleteAccount userId="test-member" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
}

it("requires an explicit typed confirmation and sends no target account ID", async () => {
  remove.mockResolvedValue({ deleted: false, requiresSignIn: false, message: "Please retry." });
  showSettings();
  const input = await screen.findByLabelText("Type DELETE to confirm");
  const button = screen.getByRole("button", { name: "Permanently delete account" });
  expect(button).toBeDisabled();
  fireEvent.change(input, { target: { value: "delete" } });
  expect(button).toBeDisabled();
  fireEvent.change(input, { target: { value: "DELETE" } });
  fireEvent.click(button);
  await waitFor(() => expect(remove).toHaveBeenCalledWith({ data: { confirmation: "DELETE" } }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please retry.");
});

it("does not delete when the member cancels", async () => {
  showSettings();
  await screen.findByLabelText("Type DELETE to confirm");
  expect(screen.getByText(/Safety reports and moderation records are retained/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Keep my account" }));
  expect(remove).not.toHaveBeenCalled();
});

it("requires a new sign-in before showing the irreversible action for an old session", async () => {
  status.mockResolvedValue({ available: true, requiresSignIn: true });
  showSettings();
  expect(await screen.findByRole("link", { name: "Sign in again" })).toHaveAttribute(
    "href",
    "/auth?next=%2Fyou",
  );
  expect(
    screen.queryByRole("button", { name: "Permanently delete account" }),
  ).not.toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();
});
