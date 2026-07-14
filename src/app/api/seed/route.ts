import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TEMPLATE_DEFINITIONS } from "@/lib/form-templates";

/// إعادة زرع القوالب (في حال الحاجة)
export async function POST() {
  try {
    // حذف القوالب السابقة
    await db.formTemplate.deleteMany({});
    await db.formTemplate.createMany({
      data: TEMPLATE_DEFINITIONS.map((t) => ({
        code: t.code,
        name: t.name,
        description: t.description,
        category: t.category,
        icon: t.icon,
        schema: JSON.stringify(t.schema),
        isActive: true,
      })),
    });
    const templates = await db.formTemplate.findMany();
    return NextResponse.json({
      success: true,
      count: templates.length,
      templates: templates.map((t) => ({ ...t, schema: JSON.parse(t.schema) })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}