import { NextResponse } from "next/server";
import { getAllCategories, getCategoryTree } from "@/lib/shop";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("tree") === "1") {
    const data = await getCategoryTree();
    return NextResponse.json(data);
  }
  const data = await getAllCategories();
  return NextResponse.json(data);
}
