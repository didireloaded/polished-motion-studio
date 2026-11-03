export { ConversationOpenerStudio } from "@/components/ConversationOpenerStudio";
export {
  EmojiStoryDecodeCard,
  FirstDateDilemmaCard,
  TwoTruthsCard,
} from "@/components/SocialGames";
export {
  buildFallbackOpeners,
  openerRequestSchema,
  openerResponseSchema,
  TONE_DESCRIPTIONS,
  type OpenerRequest,
  type OpenerTone,
} from "@/lib/conversation-opener";
export { generateConversationOpeners } from "@/lib/conversation-opener.functions";

/** Initial and paginated message batch size per thread query. */
export const MESSAGE_PAGE_SIZE = 25;
