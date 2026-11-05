import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAccountDeletionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { hasRecentSignIn } = await import("./account-deletion.server");
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      if (error || !data.user) return { available: false, requiresSignIn: false };
      return { available: true, requiresSignIn: !hasRecentSignIn(context.claims["amr"]) };
    } catch {
      return { available: false, requiresSignIn: false };
    }
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ confirmation: z.literal("DELETE") }).strict())
  .handler(async ({ context }) => {
    const token = getRequest()
      .headers.get("authorization")
      ?.replace(/^Bearer /, "");
    if (!token) throw new Error("Sign in before deleting your account.");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { deleteMemberAccount } = await import("./account-deletion.server");
      await deleteMemberAccount(supabaseAdmin, context.userId, token, context.claims["amr"]);
      return { deleted: true as const };
    } catch (error) {
      const recentSignInRequired =
        error instanceof Error && error.message === "RECENT_SIGN_IN_REQUIRED";
      return {
        deleted: false as const,
        requiresSignIn: recentSignInRequired,
        message: recentSignInRequired
          ? "Sign in again before deleting your account."
          : "Your account could not be deleted. Some uploaded files may already have been removed. Please retry, or sign in again if your session has ended.",
      };
    }
  });
