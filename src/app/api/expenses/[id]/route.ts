import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { authorized, error: authError } = await requireAdmin(req);
  if (!authorized) return authError;
  try {
    const { id } = await params;
    const body = await req.json();
    const expense = await db.expense.update({ where: { id }, data: body });
    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { authorized, error: authError } = await requireAdmin(req);
  if (!authorized) return authError;
  try {
    const { id } = await params;
    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}