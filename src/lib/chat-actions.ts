// @ts-nocheck
/**
 * Chat helpers for "درنیکا ساحل" (Dornika Sahel).
 *
 * Persists chat sessions + messages in the DB and uses the
 * `z-ai-web-dev-sdk` for both text chat and vision analysis (when the
 * user uploads an image).
 */

import { eq, and, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import ZAI from "z-ai-web-dev-sdk";

import { db } from "@/db";
import {
  chatSessions,
  chatMessages,
  products,
  productVariants,
} from "@/db/schema";
import {
  readOrGenerateSessionToken,
  resolveSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/commerce";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/* Session helpers                                                     */
/* ------------------------------------------------------------------ */

export async function ensureChatSession(): Promise<{
  sessionToken: string;
  sessionId: string;
  userId: string | null;
}> {
  const { token: sessionToken, generated } = await readOrGenerateSessionToken();
  if (generated) {
    const opts = await resolveSessionCookieOptions();
    const store = await cookies();
    store.set(SESSION_COOKIE, sessionToken, opts);
  }

  // Resolve user (best-effort — null when anonymous).
  let userId: string | null = null;
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const u = await getCurrentUser();
    userId = u?.id ?? null;
  } catch {
    userId = null;
  }

  // Find or create the chat session row.
  const existingSession = (await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(eq(chatSessions.sessionToken, sessionToken))
    .limit(1)) as Array<{ id: string }>;

  if (existingSession.length > 0) {
    return { sessionToken, sessionId: existingSession[0].id, userId };
  }

  const id = `cs_${randomUUID().replace(/-/g, "")}`;
  await db.insert(chatSessions).values({
    id,
    sessionToken,
    userId,
    status: "active",
  });
  return { sessionToken, sessionId: id, userId };
}

/* ------------------------------------------------------------------ */
/* Message persistence                                                 */
/* ------------------------------------------------------------------ */

export async function listMessages(sessionId: string): Promise<
  Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    imageUrl: string | null;
    productMatches: Array<Record<string, unknown>>;
    createdAt: Date;
  }>
> {
  const rows = (await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      imageUrl: chatMessages.imageUrl,
      productMatches: chatMessages.productMatches,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))) as Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    imageUrl: string | null;
    productMatches: Array<Record<string, unknown>>;
    createdAt: Date;
  }>;
  return rows;
}

export async function persistMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  imageUrl?: string | null,
  productMatches?: Array<Record<string, unknown>>,
): Promise<void> {
  await db.insert(chatMessages).values({
    
    sessionId,
    role,
    content,
    imageUrl: imageUrl ?? null,
    productMatches: productMatches ?? [],
  });
}

/* ------------------------------------------------------------------ */
/* AI reply                                                            */
/* ------------------------------------------------------------------ */

interface ProductMatch {
  id: string;
  title: string;
  slug: string;
  price?: number;
}

/**
 * Looks up products by free-text query. Returns up to 3 matches.
 */
async function findProductMatches(query: string): Promise<ProductMatch[]> {
  if (!query) return [];
  try {
    const rows = (await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .limit(20)) as Array<{ id: string; title: string; slug: string }>;

    const q = query.toLowerCase();
    const scored = rows
      .map((r) => ({
        r,
        score: r.title.toLowerCase().includes(q)
          ? 2
          : q.split(/\s+/).some((tok) => r.title.toLowerCase().includes(tok))
            ? 1
            : 0,
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) return [];

    // Fetch prices for the matched products.
    const ids = scored.map((s) => s.r.id);
    const variants = (await db
      .select({
        productId: productVariants.productId,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(eq(productVariants.isActive, true))) as Array<{
      productId: string;
      price: string;
    }>;
    const minPriceByProduct = new Map<string, number>();
    for (const v of variants) {
      if (!ids.includes(v.productId)) continue;
      const price = Number(v.price) || 0;
      const prev = minPriceByProduct.get(v.productId);
      if (prev == null || price < prev) {
        minPriceByProduct.set(v.productId, price);
      }
    }

    return scored.map((s) => ({
      id: s.r.id,
      title: s.r.title,
      slug: s.r.slug,
      ...(minPriceByProduct.has(s.r.id)
        ? { price: minPriceByProduct.get(s.r.id) }
        : {}),
    }));
  } catch {
    return [];
  }
}

/**
 * Calls the ZAI SDK to produce an assistant reply. Falls back to a
 * canned message when the SDK is unavailable (e.g. missing API key).
 */
async function textReply(userText: string): Promise<string> {
  try {
    const zai = await ZAI.create();
    const completion = (await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "تو دستیار فروشگاه آنلاین «درنیکا ساحل» هستی — یک پلتفرم ایرانی برای تأمین تجهیزات صنعتی و تأسیسات. پاسخ‌ها را کوتاه، مهربان و به زبان فارسی بده. اگر کاربر محصول خاصی را خواست، نام محصول را در پاسخ بیاور تا بتوانیم آن را در دیتابیس جستجو کنیم.",
        },
        { role: "user", content: userText },
      ],
    })) as { choices?: Array<{ message?: { content?: string } }> };
    const text = completion?.choices?.[0]?.message?.content;
    return (
      text ||
      "متأسفم، الان نمی‌تونم پاسخ بدم. لطفاً با شماره پشتیبانی تماس بگیرید."
    );
  } catch (e) {
    console.warn("[chat] text reply failed:", (e as Error).message);
    return "در حال حاضر اتصال به هوش مصنوعی مقدور نیست. لطفاً برای استعلام قیمت با کارشناسان ما تماس بگیرید.";
  }
}

/**
 * Calls the ZAI vision model to analyze an uploaded image. The image
 * is sent as a data URL (base64).
 */
async function visionReply(imageDataUrl: string, prompt: string): Promise<string> {
  try {
    const zai = await ZAI.create();
    const completion = (await zai.chat.completions.createVision({
      model: "glm-4v",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                prompt ||
                "این تصویر را تحلیل کن. اگر محصول صنعتی است، نام و نوع آن را به فارسی توضیح بده.",
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    })) as { choices?: Array<{ message?: { content?: string } }> };
    return (
      completion?.choices?.[0]?.message?.content ||
      "متأسفم، نتونستم تصویر رو تحلیل کنم."
    );
  } catch (e) {
    console.warn("[chat] vision reply failed:", (e as Error).message);
    return "تحلیل تصویر در حال حاضر مقدور نیست. لطفاً توضیح متنی محصول را بنویسید.";
  }
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export interface ProcessMessageResult {
  reply: string;
  products: ProductMatch[];
}

export async function processMessage(opts: {
  text: string;
  imageDataUrl?: string | null;
}): Promise<ProcessMessageResult> {
  const text = (opts.text || "").trim();
  const hasImage = !!opts.imageDataUrl;

  let reply: string;
  if (hasImage) {
    reply = await visionReply(opts.imageDataUrl!, text);
  } else if (text) {
    reply = await textReply(text);
  } else {
    return {
      reply: "لطفاً یک پیام یا تصویر ارسال کنید.",
      products: [],
    };
  }

  // Always attempt a product lookup based on the user's text.
  const productMatches = await findProductMatches(text);

  return { reply, products: productMatches };
}

// Keep desc import used.
void desc;
void and;
