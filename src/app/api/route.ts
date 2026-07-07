import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "درنیکا ساحل API",
    version: "1.0.0",
    docs: ["/api/health", "/api/categories", "/api/search", "/api/cart/items", "/api/wishlist"],
  });
}
