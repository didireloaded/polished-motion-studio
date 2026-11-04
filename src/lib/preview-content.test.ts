import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { people, restorePreviewState, type Msg, type Post } from "./namlink";
import { createPreviewContent, PREVIEW_SEED_VERSION } from "./preview-content";

describe("populated preview", () => {
  it("has complete, connected fixtures and locally available photography", () => {
    const seed = createPreviewContent(people, 1_800_000_000_000);
    const ids = new Set(people.map((person) => person.id));
    expect(people).toHaveLength(20);
    expect(ids.size).toBe(people.length);
    expect(seed.posts).toHaveLength(25);
    expect(seed.matches).toHaveLength(12);
    expect(Object.keys(seed.chats)).toHaveLength(8);
    for (const person of people) {
      expect(person.age).toBeGreaterThanOrEqual(18);
      const path = person.designPhoto ?? `/editorial/${person.photo}.jpg`;
      expect(existsSync(resolve(process.cwd(), "public", path.slice(1))), path).toBe(true);
    }
    for (const [personId, messages] of Object.entries(seed.chats)) {
      expect(ids.has(personId)).toBe(true);
      expect(seed.matches).toContain(personId);
      expect(messages.length).toBeGreaterThanOrEqual(5);
      expect(new Set(messages.map((message) => message.id)).size).toBe(messages.length);
      expect(messages.map((message) => message.at)).toEqual(
        messages.map((message) => message.at).sort((a, b) => a - b),
      );
    }
    for (const post of seed.posts) {
      expect(post.text.length).toBeLessThanOrEqual(650);
      expect(
        post.authorName === "Alex" || people.some((person) => person.name === post.authorName),
      ).toBe(true);
    }
    for (const replies of Object.values(seed.postReplies)) {
      for (const reply of replies) {
        expect(seed.posts.some((post) => post.id === reply.postId)).toBe(true);
        expect(reply.text.length).toBeLessThanOrEqual(300);
        if (reply.from === "member") expect(ids.has(reply.personId!)).toBe(true);
      }
    }
  });

  it("upgrades older preview storage without overwriting visitor activity", () => {
    const ownPost: Post = {
      id: "my-post",
      authorName: "Taylor",
      town: "Rundu",
      text: "A post I wrote",
      at: 123,
      replies: 0,
      mine: true,
    };
    const ownMessage: Msg = {
      id: "my-message",
      from: "me",
      text: "Keep this conversation",
      at: 456,
    };
    const base = restorePreviewState({});
    const restored = restorePreviewState({
      posts: [ownPost],
      chats: { p1: [ownMessage] },
      matches: ["p4"],
      liked: ["p4"],
      passed: ["p2"],
      profile: { ...base.profile, name: "Taylor", town: "Rundu" },
    });
    expect(restored.previewSeedVersion).toBe(PREVIEW_SEED_VERSION);
    expect(restored.posts).toContainEqual(ownPost);
    expect(restored.chats["p1"]).toEqual([ownMessage]);
    expect(restored.chats["p9"]!.length).toBeGreaterThan(0);
    expect(restored.matches).toContain("p4");
    expect(restored.passed).toEqual(["p2"]);
    expect(restored.profile.name).toBe("Taylor");
    expect(restored.profile.town).toBe("Rundu");
  });

  it("does not restore removed content once a preview has been upgraded", () => {
    const upgraded = restorePreviewState({});
    const restored = restorePreviewState({ ...upgraded, posts: [], chats: {}, matches: [] });
    expect(restored.posts).toEqual([]);
    expect(restored.chats).toEqual({});
    expect(restored.matches).toEqual([]);
  });

  it("does not add a seeded match or conversation with a profile already passed", () => {
    const restored = restorePreviewState({ passed: ["p9"] });
    expect(restored.passed).toContain("p9");
    expect(restored.matches).not.toContain("p9");
    expect(restored.liked).not.toContain("p9");
    expect(restored.chats["p9"]).toBeUndefined();
  });
});
