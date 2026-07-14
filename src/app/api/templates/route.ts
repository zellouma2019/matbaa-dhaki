import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TEMPLATE_DEFINITIONS } from "@/lib/form-templates";

/// زرع قوالب النماذج في قاعدة البيانات إن لم تكن موجودة
export async function GET() {
  try {
    const existing = await db.formTemplate.count();
    if (existing === 0) {
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
    }
    const templates = await db.formTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      templates: templates.map((t) => ({
        ...t,
        schema: JSON.parse(t.schema),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const template = await db.formTemplate.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description || "",
        category: body.category || "عام",
        icon: body.icon || "file-text",
        schema: JSON.stringify(body.schema || { sections: [] }),
        isActive: true,
      },
    });
    return NextResponse.json({ ...template, schema: JSON.parse(template.schema) });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}