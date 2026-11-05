import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const RECENT_SIGN_IN_MS = 15 * 60_000;

/** Use only the AMR claim from a signature-verified JWT, never client input or user metadata. */
export function hasRecentSignIn(methods: unknown, now = Date.now()) {
  if (!Array.isArray(methods)) return false;
  return methods.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const { method, timestamp } = entry;
    if (
      ![
        "password",
        "oauth",
        "otp",
        "totp",
        "magiclink",
        "sso/saml",
        "email/signup",
        "recovery",
      ].includes(method)
    )
      return false;
    const signedInAt = typeof timestamp === "number" ? timestamp * 1000 : NaN;
    return (
      Number.isFinite(signedInAt) && signedInAt <= now && now - signedInAt <= RECENT_SIGN_IN_MS
    );
  });
}

async function removeMemberFiles(admin: SupabaseClient<Database>, bucket: string, prefix: string) {
  // Always take the first page: removing files changes offsets. Folders are virtual.
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100 });
    if (error || !data) throw new Error("FILE_CLEANUP_FAILED");
    if (data.length === 0) return;
    const files: string[] = [];
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) files.push(path);
      else await removeMemberFiles(admin, bucket, path);
    }
    if (files.length) {
      const { error: removalError } = await admin.storage.from(bucket).remove(files);
      if (removalError) throw new Error("FILE_CLEANUP_FAILED");
    }
  }
}

/** Called only with the identity established by the server auth middleware. */
export async function deleteMemberAccount(
  admin: SupabaseClient<Database>,
  memberId: string,
  accessToken: string,
  authenticationMethods: unknown,
) {
  if (!hasRecentSignIn(authenticationMethods)) throw new Error("RECENT_SIGN_IN_REQUIRED");
  const { data, error } = await admin.auth.admin.getUserById(memberId);
  if (error || !data.user) throw new Error("ACCOUNT_UNAVAILABLE");

  const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");
  if (signOutError) throw new Error("SESSION_REVOCATION_FAILED");

  for (const bucket of ["profile-photos", "voice-intros", "verification-selfies"]) {
    await removeMemberFiles(admin, bucket, memberId);
  }
  // Auth deletion cascades through the database constraints in the versioned migration.
  const { error: deletionError } = await admin.auth.admin.deleteUser(memberId);
  if (deletionError) throw new Error("ACCOUNT_DELETE_FAILED");
}
