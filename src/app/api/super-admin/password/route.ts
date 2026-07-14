import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

/// تغيير كلمة مرور المدير الأول
export async function PUT(req: NextRequest) {
  const rl = withRateLimit(req, "super-admin-password");
  if (!rl.ok) return rl.response;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json({ error: "كلمة المرور الجديدة مطلوبة" }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل" },
        { status: 400 },
      );
    }

    let admin = await db.superAdmin.findUnique({ where: { key: "main" } });
    if (!admin) {
      admin = await db.superAdmin.create({ data: { key: "main" } });
    }

    // أول مرة: لا نطلب كلمة المرور الحالية (كلمة المرور فارغة أو افتراضية)
    const isFirstTime = !admin.password || admin.password === "Admin@2025";
    if (!isFirstTime) {
      if (!currentPassword) {
        return NextResponse.json({ error: "كلمة المرور الحالية مطلوبة" }, { status: 400 });
      }
      if (admin.password !== currentPassword) {
        return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 401 });
      }
    }

    await db.superAdmin.update({
      where: { key: "main" },
      data: { password: newPassword },
    });

    return NextResponse.json({ success: true, isFirstTime });
  } catch {
    return NextResponse.json({ error: "خطأ في تحديث كلمة المرور" }, { status: 500 });
  }
}

/// جلب حالة كلمة المرور (هل هي الافتراضية؟)
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "super-admin-password-get");
  if (!rl.ok) return rl.response;

  try {
    const admin = await db.superAdmin.findUnique({ where: { key: "main" } });
    const isDefault = !admin || !admin.password || admin.password === "Admin@2025";
    return NextResponse.json({ isDefault });
  } catch {
    return NextResponse.json({ isDefault: true });
  }
}