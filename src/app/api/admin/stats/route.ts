import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAutoCleanup } from "@/lib/cleanup";
import { withRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "admin-stats");
  if (!rl.ok) return rl.response;
  try {
    await runAutoCleanup();
    const shopId = req.nextUrl.searchParams.get("shopId");
    const where = shopId ? { shopId } : {};

    const totalOrders = await db.printOrder.count({ where });
    const totalRevenue = await db.printOrder.aggregate({ _sum: { total: true }, where });
    const totalExpenses = await db.expense.aggregate({ _sum: { amount: true } });
    const expensesSum = totalExpenses._sum.amount || 0;
    const revenueSum = totalRevenue._sum.total || 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await db.printOrder.count({
      where: { ...where, createdAt: { gte: todayStart } },
    });

    const statusCounts = await db.printOrder.groupBy({
      by: ["status"],
      _count: true,
      where,
    });

    const serviceCounts = await db.printOrder.groupBy({
      by: ["serviceType"],
      _count: true,
      _sum: { total: true },
      where,
    });

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => (statusMap[s.status] = s._count));

    const recentOrders = await db.printOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      totalOrders,
      totalRevenue: revenueSum,
      totalExpenses: expensesSum,
      profit: revenueSum - expensesSum,
      todayOrders,
      statusCounts: statusMap,
      serviceCounts: serviceCounts.map((s) => ({
        serviceType: s.serviceType,
        count: s._count,
        revenue: s._sum.total || 0,
      })),
      recentOrders: recentOrders.map((o) => ({
        ...o,
        options: JSON.parse(o.options),
        customer: JSON.parse(o.customer),
        delivery: JSON.parse(o.delivery),
        pricing: JSON.parse(o.pricing),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}