import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

/// جلب بيانات متجر محدد
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(req, "shop-detail");
  if (!rl.ok) return rl.response;
  try {
    const { slug } = await params;
    const shop = await db.shop.findUnique({
      where: { slug },
    });

    if (!shop || !shop.isActive) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    // لا نُرجع كلمة المرور
    const { adminPin: _, ...safeShop } = shop;

    return NextResponse.json({ shop: safeShop });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/// تحديث بيانات المتجر
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(req, "shop-detail");
  if (!rl.ok) return rl.response;
  try {
    const { slug } = await params;
    const body = await req.json();

    // التحقق من كلمة المرور (إلزامي دائماً)
    const shop = await db.shop.findUnique({ where: { slug } });
    if (!shop || !body.adminPin || shop.adminPin !== String(body.adminPin)) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 403 });
    }

    // البيانات القابلة للتعديل (بدون كلمة المرور والمعرّف)
    const { adminPin: _pin, slug: _slug, id: _id, createdAt: _c, updatedAt: _u, ...updateData } = body;

    const updated = await db.shop.update({
      where: { slug },
      data: updateData,
    });

    const { adminPin: __, ...safeShop } = updated;

    return NextResponse.json({ shop: safeShop });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/// حذف متجر
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(req, "shop-detail");
  if (!rl.ok) return rl.response;
  try {
    const { slug } = await params;
    const { adminPin } = await req.json();

    const shop = await db.shop.findUnique({ where: { slug } });
    if (!shop || shop.adminPin !== String(adminPin)) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 403 });
    }

    // حذف الطلبات والإعدادات المرتبطة أولاً
    await db.printOrder.deleteMany({ where: { shopId: shop.id } });
    await db.setting.deleteMany({ where: { shopId: shop.id } });
    await db.shop.delete({ where: { id: shop.id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}