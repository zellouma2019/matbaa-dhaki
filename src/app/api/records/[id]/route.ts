import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = await db.formRecord.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!record) {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }
    return NextResponse.json({
      ...record,
      data: JSON.parse(record.data),
      schema: JSON.parse(record.template.schema),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { applicantName, subject, status, priority, data, notes } = body;

    const existing = await db.formRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }

    const record = await db.formRecord.update({
      where: { id },
      data: {
        applicantName: applicantName ?? existing.applicantName,
        subject: subject ?? existing.subject,
        status: status ?? existing.status,
        priority: priority ?? existing.priority,
        data: data ? JSON.stringify(data) : existing.data,
        notes: notes ?? existing.notes,
        submittedAt:
          status === "submitted" && !existing.submittedAt ? new Date() : existing.submittedAt,
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.formRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}