import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MATCH_EMAIL_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const lastMatchEmailByUser = new Map<string, number>();

async function dispatchBrevoEmail(payload: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}): Promise<boolean> {
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey || !payload.toEmail) return false;
  const senderEmail = process.env["BREVO_SENDER_EMAIL"] ?? "hello@mutal.na";
  const senderName = process.env["BREVO_SENDER_NAME"] ?? "Mutal";

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: payload.toEmail, name: payload.toName }],
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        textContent: payload.textContent,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      displayName: z.string().trim().min(2).max(40),
      town: z.string().trim().min(2).max(40),
    }),
  )
  .handler(async ({ context, data }): Promise<{ sent: boolean }> => {
    const email = typeof context.claims["email"] === "string" ? context.claims["email"] : "";
    if (!email) return { sent: false };
    const safeName = data.displayName.replace(/[<>&"]/g, "");
    const safeTown = data.town.replace(/[<>&"]/g, "");
    const sent = await dispatchBrevoEmail({
      toEmail: email,
      toName: safeName,
      subject: `Welcome to Mutal, ${safeName}`,
      textContent: [
        `Welcome to Mutal, ${safeName}!`,
        "",
        `Your profile in ${safeTown} is live. Here are 3 quick tips to get your first genuine connection:`,
        "1. Add a short voice intro so people can hear your hello.",
        "2. Share what you value in a partner to rank your matches.",
        "3. Meet in public places and use the in-chat Date Planner when you're both ready.",
      ].join("\n"),
      htmlContent: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b;">
        <h2 style="margin:0 0 12px;font-size:20px;">Welcome to Mutal, ${safeName}</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
          Your profile in <strong>${safeTown}</strong> is ready. Mutal is built for calm, genuine connections across Namibia.
        </p>
        <ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.6;color:#3f3f46;">
          <li>Add a 30-second voice intro so people can hear your hello.</li>
          <li>Likes stay private until interest is mutual.</li>
          <li>Always choose public venues and share your plans with a friend you trust.</li>
        </ul>
      </div>`,
    });
    return { sent };
  });

export const sendMatchAlertEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      matchId: z.string().uuid(),
      partnerName: z.string().trim().min(1).max(40),
    }),
  )
  .handler(async ({ context, data }): Promise<{ sent: boolean }> => {
    const { userId } = context;
    const now = Date.now();
    const lastSent = lastMatchEmailByUser.get(userId) ?? 0;
    if (now - lastSent < MATCH_EMAIL_COOLDOWN_MS) {
      return { sent: false };
    }
    const email = typeof context.claims["email"] === "string" ? context.claims["email"] : "";
    if (!email) return { sent: false };

    const safePartner = data.partnerName.replace(/[<>&"]/g, "");
    const sent = await dispatchBrevoEmail({
      toEmail: email,
      toName: "Mutal Member",
      subject: `It’s a match! You and ${safePartner} both want to connect`,
      textContent: `You and ${safePartner} both liked each other on Mutal. Open Chats to say hello and start a conversation.`,
      htmlContent: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b;">
        <h2 style="margin:0 0 12px;font-size:20px;">It’s a Match!</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b;">
          You and <strong>${safePartner}</strong> both chose to connect on Mutal. Start with a quick hello while the moment is fresh.
        </p>
      </div>`,
    });
    if (sent) lastMatchEmailByUser.set(userId, now);
    return { sent };
  });
