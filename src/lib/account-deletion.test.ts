// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deleteMemberAccount, hasRecentSignIn } from "./account-deletion.server";

const member = "00000000-0000-4000-8000-000000000001";
const recent = () => [{ method: "oauth", timestamp: Math.floor(Date.now() / 1000) }];

function fixture() {
  const files = new Map<string, { id: string | null; name: string }[]>([
    [
      `profile-photos:${member}`,
      [
        { id: null, name: "nested" },
        { id: "one", name: "cover.jpg" },
      ],
    ],
    [`profile-photos:${member}/nested`, [{ id: "two", name: "extra.jpg" }]],
  ]);
  const calls: string[] = [];
  const list = vi.fn(async (bucket: string, prefix: string) => ({
    data: (files.get(`${bucket}:${prefix}`) ?? []).slice(0, 100),
    error: null,
  }));
  const remove = vi.fn(async (bucket: string, paths: string[]) => {
    calls.push("files");
    for (const path of paths) {
      const parent = path.slice(0, path.lastIndexOf("/"));
      files.set(
        `${bucket}:${parent}`,
        (files.get(`${bucket}:${parent}`) ?? []).filter(
          (entry) => `${parent}/${entry.name}` !== path,
        ),
      );
      if (!files.get(`${bucket}:${parent}`)?.length && parent !== member) {
        files.set(
          `${bucket}:${member}`,
          (files.get(`${bucket}:${member}`) ?? []).filter(
            (entry) => `${member}/${entry.name}` !== parent,
          ),
        );
      }
    }
    return { data: [], error: null };
  });
  const getUserById = vi.fn(async () => ({ data: { user: { id: member } }, error: null }));
  const signOut = vi.fn(async () => {
    calls.push("revoke");
    return { error: null };
  });
  const deleteUser = vi.fn(async () => {
    calls.push("delete");
    return { data: {}, error: null };
  });
  const client = {
    auth: { admin: { getUserById, signOut, deleteUser } },
    storage: {
      from: (bucket: string) => ({
        list: (prefix: string) => list(bucket, prefix),
        remove: (paths: string[]) => remove(bucket, paths),
      }),
    },
  } as unknown as SupabaseClient<Database>;
  return { client, files, calls, list, remove, getUserById, signOut, deleteUser };
}

describe("account deletion", () => {
  it("does not treat refreshed or malformed tokens as recent authentication", () => {
    const now = Date.now();
    expect(
      hasRecentSignIn(
        [
          { method: "password", timestamp: (now - 16 * 60_000) / 1000 },
          { method: "token_refresh", timestamp: now / 1000 },
        ],
        now,
      ),
    ).toBe(false);
    expect(hasRecentSignIn(undefined, now)).toBe(false);
    expect(hasRecentSignIn([{ method: "oauth", timestamp: "today" }], now)).toBe(false);
    expect(hasRecentSignIn([{ method: "oauth", timestamp: (now + 1000) / 1000 }], now)).toBe(false);
    expect(hasRecentSignIn(recent(), now)).toBe(true);
  });

  it("rejects stale authentication before deleting files or revoking sessions", async () => {
    const f = fixture();
    await expect(deleteMemberAccount(f.client, member, "test-token", [])).rejects.toThrow(
      "RECENT_SIGN_IN_REQUIRED",
    );
    expect(f.getUserById).not.toHaveBeenCalled();
    expect(f.calls).toEqual([]);
  });

  it("revokes sessions, removes nested owned files, then deletes only the authenticated account", async () => {
    const f = fixture();
    await deleteMemberAccount(f.client, member, "test-token", recent());
    expect(f.signOut).toHaveBeenCalledWith("test-token", "global");
    expect(f.deleteUser).toHaveBeenCalledWith(member);
    expect(f.calls[0]).toBe("revoke");
    expect(f.calls.at(-1)).toBe("delete");
    expect(f.remove).toHaveBeenCalledWith("profile-photos", [`${member}/nested/extra.jpg`]);
    expect(f.files.get(`profile-photos:${member}`)).toEqual([]);
    expect(f.list.mock.calls.every(([, prefix]) => prefix.startsWith(member))).toBe(true);
  });

  it("keeps the Auth account when file cleanup fails, so deletion can be retried", async () => {
    const f = fixture();
    f.remove.mockResolvedValueOnce({ data: [], error: new Error("Storage unavailable") } as never);
    await expect(deleteMemberAccount(f.client, member, "test-token", recent())).rejects.toThrow(
      "FILE_CLEANUP_FAILED",
    );
    expect(f.deleteUser).not.toHaveBeenCalled();
  });

  it("removes every page without skipping objects after deletion changes offsets", async () => {
    const f = fixture();
    f.files.set(
      `voice-intros:${member}`,
      Array.from({ length: 101 }, (_, index) => ({ id: `${index}`, name: `${index}.webm` })),
    );
    await deleteMemberAccount(f.client, member, "test-token", recent());
    expect(f.files.get(`voice-intros:${member}`)).toEqual([]);
    expect(f.remove.mock.calls.filter(([bucket]) => bucket === "voice-intros")).toHaveLength(2);
  });

  it("stops before file deletion if session revocation fails", async () => {
    const f = fixture();
    f.signOut.mockResolvedValueOnce({ error: new Error("Auth unavailable") } as never);
    await expect(deleteMemberAccount(f.client, member, "test-token", recent())).rejects.toThrow(
      "SESSION_REVOCATION_FAILED",
    );
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.deleteUser).not.toHaveBeenCalled();
  });
});
