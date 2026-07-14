import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "order-detail");
  if (!rl.ok) return rl.response;
  try {
    const { id } = await params;
    const shopId = req.nextUrl.searchParams.get("shopId");
    const order = shopId
      ? await db.printOrder.findFirst({ where: { id, shopId } })
      : await db.printOrder.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    return NextResponse.json({
      ...order,
      options: JSON.parse(order.options),
      customer: JSON.parse(order.customer),
      delivery: JSON.parse(order.delivery),
      pricing: JSON.parse(order.pricing),
      smartAnalysis: order.smartAnalysis ? JSON.parse(order.smartAnalysis) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "order-detail");
  if (!rl.ok) return rl.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, shopId } = body;

    const existing = shopId
      ? await db.printOrder.findFirst({ where: { id, shopId } })
      : await db.printOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "ready" && !existing.readyAt) updateData.readyAt = new Date();
    if (status === "delivered" && !existing.deliveredAt) updateData.deliveredAt = new Date();

    const order = await db.printOrder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...order,
      options: JSON.parse(order.options),
      customer: JSON.parse(order.customer),
      delivery: JSON.parse(order.delivery),
      pricing: JSON.parse(order.pricing),
      smartAnalysis: order.smartAnalysis ? JSON.parse(order.smartAnalysis) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "order-detail");
  if (!rl.ok) return rl.response;
  try {
    const { id } = await params;
    const shopId = req.nextUrl.searchParams.get("shopId");
    if (shopId) {
      const existing = await db.printOrder.findFirst({ where: { id, shopId } });
      if (!existing) {
        return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      }
    }
    await db.printOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
