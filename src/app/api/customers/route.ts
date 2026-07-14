import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/customers?search=xxx&page=1&limit=20
export async function GET(request: Request) {
  const { authorized, error: authError } = await requireAdmin(request);
  if (!authorized) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { totalSpent: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/customers — sync from orders or create manually
export async function POST(request: Request) {
  const { authorized, error: authError } = await requireAdmin(request);
  if (!authorized) return authError;

  try {
    const body = await request.json();
    const { action, phone, name, email, address, notes } = body;

    if (action === "sync") {
      // Sync customers from all orders
      const orders = await db.printOrder.findMany({
        select: { customer: true, total: true, createdAt: true, status: true },
      });

      const customerMap: Record<string, { name: string; email: string; address: string; orders: number; spent: number; lastOrder: Date }> = {};

      orders.forEach((o) => {
        try {
          const c = JSON.parse(o.customer);
          const p = c.phone || c.whatsapp;
          if (!p) return;
          if (!customerMap[p]) {
            customerMap[p] = { name: c.name || "", email: c.email || "", address: c.address || "", orders: 0, spent: 0, lastOrder: new Date(0) };
          }
          customerMap[p].orders += 1;
          if (o.status !== "cancelled") customerMap[p].spent += o.total;
          if (new Date(o.createdAt) > customerMap[p].lastOrder) customerMap[p].lastOrder = new Date(o.createdAt);
          if (c.email && !customerMap[p].email) customerMap[p].email = c.email;
          if (c.address && !customerMap[p].address) customerMap[p].address = c.address;
          if (c.name && !customerMap[p].name) customerMap[p].name = c.name;
        } catch { /* skip */ }
      });

      let synced = 0;
      for (const [phone, data] of Object.entries(customerMap)) {
        await db.customer.upsert({
          where: { phone },
          create: {
            phone,
            name: data.name,
            email: data.email || null,
            address: data.address || null,
            totalOrders: data.orders,
            totalSpent: data.spent,
            lastOrderAt: data.lastOrder,
          },
          update: {
            name: data.name || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
            totalOrders: data.orders,
            totalSpent: data.spent,
            lastOrderAt: data.lastOrder,
          },
        });
        synced++;
      }

      return NextResponse.json({ synced });
    }

    // Manual create
    if (!phone || !name) {
      return NextResponse.json({ error: "الاسم والهاتف مطلوبان" }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: { phone, name, email: email || null, address: address || null, notes: notes || null },
    });
    return NextResponse.json(customer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}