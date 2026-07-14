import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { getNextThemeId } from "@/lib/themes";

/// إنشاء متجر جديد
export async function POST(req: NextRequest) {
  const rl = withRateLimit(req, "shops");
  if (!rl.ok) return rl.response;
  try {
    const body = await req.json();
    const { name, slug, adminPin, ownerName, ownerPhone, phone, whatsapp, email, address, trialDays } = body;

    if (!name || !slug || !adminPin) {
      return NextResponse.json({ error: "الاسم والمعرّف وكلمة المرور مطلوبة" }, { status: 400 });
    }

    // التحقق من عدم تكرار المعرّف
    const existing = await db.shop.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "هذا المعرّف مستخدم بالفعل" }, { status: 409 });
    }

    const shop = await db.shop.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
        adminPin: String(adminPin),
        themeId: body.themeId || getNextThemeId(),
        ownerName: ownerName || null,
        ownerPhone: ownerPhone || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        address: address || null,
        trialDays: trialDays ? Number(trialDays) : null,
        trialStartsAt: trialDays ? new Date() : null,
      },
    });

    return NextResponse.json(shop, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/// جلب كل المتاجر (للـ Super Admin)
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "shops");
  if (!rl.ok) return rl.response;
  try {
    const shops = await db.shop.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        phone: true,
        ownerName: true,
        ownerPhone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({ shops });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}