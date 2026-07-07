import { NextResponse } from "next/server";

import {
  ensureChatSession,
  persistMessage,
  listMessages,
  processMessage,
} from "@/lib/chat-actions";

export const runtime = "nodejs";

/**
 * POST /api/chat
 *
 * Accepts either JSON `{ message: string }` or multipart/form-data with
 * a `message` field and an `image` file attachment.
 *
 * Returns `{ reply: string, products?: ProductMatch[] }`.
 */
export async function POST(req: Request) {
  const { sessionId } = await ensureChatSession();

  let text = "";
  let imageDataUrl: string | null = null;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    text = (fd.get("message") as string | null) || "";
    const file = fd.get("image") as File | null;
    if (file && file.size > 0) {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      imageDataUrl = `data:${file.type || "image/jpeg"};base64,${b64}`;
    }
  } else {
    try {
      const body = (await req.json()) as { message?: string };
      text = body.message || "";
    } catch {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
  }

  // Persist the user's message.
  await persistMessage(sessionId, "user", text, imageDataUrl);

  const { reply, products } = await processMessage({
    text,
    imageDataUrl,
  });

  await persistMessage(
    sessionId,
    "assistant",
    reply,
    null,
    products as unknown as Array<Record<string, unknown>>,
  );

  return NextResponse.json({
    reply,
    products: products.length > 0 ? products : undefined,
  });
}

/**
 * GET /api/chat
 * Returns the chat history for the calling session.
 */
export async function GET() {
  const { sessionId } = await ensureChatSession();
  const items = await listMessages(sessionId);
  return NextResponse.json({ items });
}
