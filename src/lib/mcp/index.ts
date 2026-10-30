import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMatches from "./tools/list-matches";
import listPosts from "./tools/list-posts";
import { trackTool } from "./analytics";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "motion-polish-playground",
  title: "Motion Polish Playground",
  version: "0.1.0",
  instructions:
    "Tools for the Mutal dating app. Read your own profile, your matches and community posts, acting as the signed-in member.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [trackTool(getMyProfile), trackTool(listMatches), trackTool(listPosts)],
});
