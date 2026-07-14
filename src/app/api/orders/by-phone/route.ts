import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { runAutoCleanup } from "@/lib/cleanup";

/// جلب جميع الطلبات المرتبطة برقم هاتف معين (لتكرار الطلب)
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "orders-by-phone");
  if (!rl.ok) return rl.response;
  try {
    await runAutoCleanup();

    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get("phone") || "").trim();
    const shopId = searchParams.get("shopId");

    if (!phone || phone.length < 8) {
      return NextResponse.json({ orders: [], message: "رقم الهاتف قصير جداً" });
    }

    // تطبيع الرقم: إزالة المسافات والشرطات
    const normalized = phone.replace(/[\s\-+]/g, "");

    const where: Record<string, unknown> = {
      customer: { contains: normalized.substring(0, 8) },
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
      count: orders.length,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
