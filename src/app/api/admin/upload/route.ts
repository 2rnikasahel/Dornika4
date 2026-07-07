import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { uploadedFiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  const data = await db.select().from(uploadedFiles);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "فایلی ارسال نشده." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: "حداکثر حجم ۵ مگابایت." }, { status: 400 });
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "svg"].includes(ext || "")) return NextResponse.json({ ok: false, error: "فقط تصاویر مجاز است." }, { status: 400 });
    const filename = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    const url = `/uploads/${filename}`;
    const [saved] = await db.insert(uploadedFiles).values({ filename, url, mimeType: file.type, size: file.size, category: "general" }).returning();
    return NextResponse.json({ ok: true, file: saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
