import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAutoCleanup } from "@/lib/cleanup";
import { withRateLimit } from "@/lib/rate-limit";

/// تتبّع الطلب برقم المرجع أو رقم الهاتف
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "track");
  if (!rl.ok) return rl.response;
  try {
    await runAutoCleanup();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const shopId = searchParams.get("shopId");

    if (!q) {
      return NextResponse.json({ orders: [] });
    }

    const where: Record<string, unknown> = {
      OR: [
        { reference: { contains: q } },
        { customer: { contains: q } },
      ],
    };
    if (shopId) where.shopId = shopId;

    const orders = await db.printOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        options: JSON.parse(o.options),
        customer: JSON.parse(o.customer),
        delivery: JSON.parse(o.delivery),
        pricing: JSON.parse(o.pricing),
        smartAnalysis: o.smartAnalysis ? JSON.parse(o.smartAnalysis) : null,
      })),
    });
  } catch (e) {
    console.error("Track API error:", e);
    return NextResponse.json({ orders: [] }, { status: 200 });
  }
}
