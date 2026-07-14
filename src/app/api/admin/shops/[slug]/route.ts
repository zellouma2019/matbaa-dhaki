import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

/// تحديث متجر من طرف المالك (بدون كلمة مرور)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(req, "admin-shop");
  if (!rl.ok) return rl.response;

  try {
    const { slug } = await params;
    const body = await req.json();

    const shop = await db.shop.findUnique({ where: { slug } });
    if (!shop) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    // الحقول المسموح بتعديلها
    const allowed = [
      "name", "phone", "whatsapp", "email", "address",
      "ownerName", "ownerPhone", "adminPin", "primaryColor",
      "isActive", "trialDays", "trialStartsAt",
      "plan", "features", "paymentInfo", "ownerNotes",
      "logoUrl", "logoIcon", "themeId",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "trialDays" && body[key] === "") {
          updateData[key] = null;
        } else if (key === "trialStartsAt" && (body[key] === "" || body[key] === null)) {
          updateData[key] = null;
        } else if (key === "trialDays") {
          updateData[key] = Number(body[key]) || null;
        } else if (key === "features" && typeof body[key] === "object") {
          updateData[key] = JSON.stringify(body[key]);
        } else if (key === "paymentInfo" || key === "ownerNotes") {
          updateData[key] = body[key] || null;
        } else {
          updateData[key] = body[key];
        }
      }
    }

    // إذا تم تعيين مدة تجربة ولم يحدد تاريخ بداية، ابدأ من الآن
    if (updateData.trialDays && !updateData.trialStartsAt && !shop.trialStartsAt) {
      updateData.trialStartsAt = new Date();
    }

    const updated = await db.shop.update({
      where: { slug },
      data: updateData,
    });

    const { adminPin: _, ...safeShop } = updated;
    return NextResponse.json({ shop: safeShop });
  } catch {
    return NextResponse.json({ error: "خطأ في تحديث المتجر" }, { status: 500 });
  }
}

/// حذف متجر من طرف المالك
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(req, "admin-shop-delete");
  if (!rl.ok) return rl.response;

  try {
    const { slug } = await params;
    const shop = await db.shop.findUnique({ where: { slug } });
    if (!shop) {
      return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    }

    await db.printOrder.deleteMany({ where: { shopId: shop.id } });
    await db.setting.deleteMany({ where: { shopId: shop.id } });
    await db.shop.delete({ where: { id: shop.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطأ في حذف المتجر" }, { status: 500 });
  }
}