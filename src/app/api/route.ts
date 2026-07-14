import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "health");
  if (!rl.ok) return rl.response;
  return NextResponse.json({ message: "مطبعة الذكي — الخادم يعمل" });
}