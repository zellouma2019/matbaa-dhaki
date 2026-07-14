import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

interface TeamMember {
  email: string;
  name: string;
  role: string;
  addedAt: string;
}

/// جلب قائمة أعضاء الفريق
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "super-admin-team-get");
  if (!rl.ok) return rl.response;

  try {
    let admin = await db.superAdmin.findUnique({ where: { key: "main" } });
    if (!admin) {
      admin = await db.superAdmin.create({ data: { key: "main" } });
    }

    const members: TeamMember[] = JSON.parse(admin.teamMembers || "[]");
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ members: [] });
  }
}

/// إضافة عضو فريق جديد
export async function POST(req: NextRequest) {
  const rl = withRateLimit(req, "super-admin-team-post");
  if (!rl.ok) return rl.response;

  try {
    const { email, name, role } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "الإيميل والاسم مطلوبان" }, { status: 400 });
    }

    // تحقق من صحة الإيميل
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "إيميل غير صالح" }, { status: 400 });
    }

    let admin = await db.superAdmin.findUnique({ where: { key: "main" } });
    if (!admin) {
      admin = await db.superAdmin.create({ data: { key: "main" } });
    }

    const members: TeamMember[] = JSON.parse(admin.teamMembers || "[]");

    // تحقق من عدم التكرار
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: "هذا الإيميل مضاف مسبقاً" }, { status: 409 });
    }

    members.push({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: role || "member",
      addedAt: new Date().toISOString(),
    });

    await db.superAdmin.update({
      where: { key: "main" },
      data: { teamMembers: JSON.stringify(members) },
    });

    return NextResponse.json({ success: true, members });
  } catch {
    return NextResponse.json({ error: "خطأ في إضافة العضو" }, { status: 500 });
  }
}

/// حذف عضو فريق
export async function DELETE(req: NextRequest) {
  const rl = withRateLimit(req, "super-admin-team-delete");
  if (!rl.ok) return rl.response;

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "الإيميل مطلوب" }, { status: 400 });
    }

    let admin = await db.superAdmin.findUnique({ where: { key: "main" } });
    if (!admin) {
      return NextResponse.json({ error: "لا توجد بيانات" }, { status: 404 });
    }

    const members: TeamMember[] = JSON.parse(admin.teamMembers || "[]");
    const filtered = members.filter((m) => m.email !== email);

    if (filtered.length === members.length) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    await db.superAdmin.update({
      where: { key: "main" },
      data: { teamMembers: JSON.stringify(filtered) },
    });

    return NextResponse.json({ success: true, members: filtered });
  } catch {
    return NextResponse.json({ error: "خطأ في حذف العضو" }, { status: 500 });
  }
}