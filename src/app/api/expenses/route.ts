import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const { authorized, error: authError } = await requireAdmin(request);
  if (!authorized) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({ where, orderBy: { date: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.expense.count({ where }),
    ]);

    const totalAmount = await db.expense.aggregate({ _sum: { amount: true }, where });

    return NextResponse.json({
      expenses,
      totalAmount: totalAmount._sum.amount || 0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { authorized, error: authError } = await requireAdmin(request);
  if (!authorized) return authError;
  try {
    const body = await request.json();
    const { category, amount, description, date } = body;
    if (!category || !amount) {
      return NextResponse.json({ error: "الفئة والمبلغ مطلوبان" }, { status: 400 });
    }
    const expense = await db.expense.create({
      data: { category, amount: Number(amount), description: description || null, date: date ? new Date(date) : new Date() },
    });
    return NextResponse.json(expense);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}