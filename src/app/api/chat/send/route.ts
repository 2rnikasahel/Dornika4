import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatSessions, chatMessages, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const CHAT_COOKIE = "dornika_chat_session";

async function getOrCreateSession() {
  const store = await cookies();
  let token = store.get(CHAT_COOKIE)?.value;
  if (token) {
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.sessionToken, token)).limit(1);
    if (s) return s;
  }
  token = crypto.randomBytes(24).toString("hex");
  const [session] = await db.insert(chatSessions).values({ sessionToken: token, status: "active" }).returning();
  return session;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getOrCreateSession();
    const body = await req.json();
    const content = String(body?.content || "").trim();
    const imageBase64 = body?.imageBase64 ? String(body.imageBase64) : null;
    if (!content && !imageBase64) return NextResponse.json({ ok: false, error: "پیام الزامی است." }, { status: 400 });

    let imageUrl: string | null = null;
    if (imageBase64) imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    await db.insert(chatMessages).values({ sessionId: session.id, role: "user", content: content || "(عکس ارسال شد)", imageUrl });

    let assistantContent = "";
    let productMatches: number[] = [];

    if (imageBase64) {
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAI.create();
        const vlmResponse = await zai.chat.completions.createVision({
          model: "glm-4.6v",
          messages: [{ role: "user", content: [
            { type: "text", text: "این عکس را تحلیل کن و بگو چه نوع محصول صنعتی در آن دیده می‌شود." },
            { type: "image_url", image_url: { url: imageUrl! } },
          ]}],
          thinking: { type: "disabled" },
        });
        assistantContent = vlmResponse.choices[0]?.message?.content || "تحلیل ناموفق بود.";
      } catch { assistantContent = "خطا در تحلیل عکس."; }
    } else {
      const allProducts = await db.select({ id: products.id, title: products.title }).from(products).where(eq(products.isActive, true));
      const matched = allProducts.filter(p => content.split(/\s+/).some(w => w.length > 2 && p.title.includes(w))).slice(0, 3);
      if (matched.length > 0) {
        productMatches = matched.map(p => p.id);
        assistantContent = `محصولات مرتبط با «${content}» یافت شد:\n`;
        matched.forEach((p, i) => { assistantContent += `${i + 1}. ${p.title}\n`; });
      } else {
        assistantContent = "سلام! من دستیار درنیکا ساحل هستم. می‌توانید نام محصول را بپرسید یا عکس ارسال کنید.";
      }
    }

    await db.insert(chatMessages).values({ sessionId: session.id, role: "assistant", content: assistantContent, productMatches: productMatches.length > 0 ? productMatches : null });
    const res = NextResponse.json({ ok: true, message: { role: "assistant", content: assistantContent, productMatches: productMatches.length > 0 ? productMatches : undefined } });
    res.cookies.set(CHAT_COOKIE, session.sessionToken, { path: "/", maxAge: 86400 * 7, httpOnly: true, sameSite: "lax" });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: "خطا در پردازش پیام." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(CHAT_COOKIE)?.value;
    if (!token) return NextResponse.json({ ok: true, messages: [] });
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionToken, token)).limit(1);
    if (!session) return NextResponse.json({ ok: true, messages: [] });
    const messages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, session.id));
    return NextResponse.json({ ok: true, messages: messages.map(m => ({ role: m.role, content: m.content, imageUrl: m.imageUrl, productMatches: m.productMatches })) });
  } catch { return NextResponse.json({ ok: true, messages: [] }); }
}
