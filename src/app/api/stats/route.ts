import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const totalRecords = await db.formRecord.count();
    const totalTemplates = await db.formTemplate.count();

    const statusCounts = await db.formRecord.groupBy({
      by: ["status"],
      _count: true,
    });

    const templateCounts = await db.formRecord.groupBy({
      by: ["templateId"],
      _count: true,
    });

    const templates = await db.formTemplate.findMany();
    const templateMap = Object.fromEntries(templates.map((t) => [t.id, t]));

    const byTemplate = templateCounts.map((tc) => ({
      templateId: tc.templateId,
      code: templateMap[tc.templateId]?.code || "—",
      name: templateMap[tc.templateId]?.name || "—",
      count: tc._count,
    }));

    // آخر 7 أيام
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRecords = await db.formRecord.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count;
    });

    return NextResponse.json({
      totalRecords,
      totalTemplates,
      recentRecords,
      statusCounts: statusMap,
      byTemplate,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}