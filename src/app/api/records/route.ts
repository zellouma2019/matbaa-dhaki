import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function generateReference(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `${y}${m}${d}-${rnd}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (templateId) where.templateId = templateId;
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { applicantName: { contains: search } },
        { subject: { contains: search } },
        { reference: { contains: search } },
      ];
    }

    const records = await db.formRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { template: true },
    });

    return NextResponse.json({
      records: records.map((r) => ({
        ...r,
        data: JSON.parse(r.data),
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
    const { templateId, applicantName, subject, status, priority, data, notes } = body;

    // تأكد من وجود القالب
    const template = await db.formTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    }

    // توليد رقم مرجعي فريد
    let reference = generateReference();
    let exists = await db.formRecord.findUnique({ where: { reference } });
    while (exists) {
      reference = generateReference();
      exists = await db.formRecord.findUnique({ where: { reference } });
    }

    const record = await db.formRecord.create({
      data: {
        reference,
        templateId,
        applicantName: applicantName || "—",
        subject: subject || "—",
        status: status || "draft",
        priority: priority || "normal",
        data: JSON.stringify(data || {}),
        notes: notes || null,
        submittedAt: status === "submitted" ? new Date() : null,
      },
      include: { template: true },
    });

    return NextResponse.json({
      ...record,
      data: JSON.parse(record.data),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}