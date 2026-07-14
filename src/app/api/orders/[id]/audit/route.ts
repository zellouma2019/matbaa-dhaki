import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrderAuditLogs } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const logs = await getOrderAuditLogs(id);
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}