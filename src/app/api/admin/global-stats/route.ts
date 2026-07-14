import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

/// إحصائيات شاملة لصاحب المشروع (جميع المتاجر)
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "global-stats");
  if (!rl.ok) return rl.response;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // إحصائيات عامة
    const [totalOrders, totalRevenueResult, todayOrdersResult, shops] = await Promise.all([
      db.printOrder.count(),
      db.printOrder.aggregate({ _sum: { total: true } }),
      db.printOrder.count({ where: { createdAt: { gte: today } } }),
      db.shop.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { orders: true } },
        },
      }),
    ]);

    const totalRevenue = totalRevenueResult._sum.total || 0;

    // إحصائيات لكل متجر
    const shopStats = await Promise.all(
      shops.map(async (shop) => {
        const [shopRevenue, shopToday] = await Promise.all([
          db.printOrder.aggregate({
            where: { shopId: shop.id },
            _sum: { total: true },
          }),
          db.printOrder.count({
            where: { shopId: shop.id, createdAt: { gte: today } },
          }),
        ]);

        // آخر 5 طلبات لكل متجر
        const recentShopOrders = await db.printOrder.findMany({
          where: { shopId: shop.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        return {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          ownerName: shop.ownerName,
          ownerPhone: shop.ownerPhone,
          phone: shop.phone,
          whatsapp: shop.whatsapp,
          email: shop.email,
          address: shop.address,
          primaryColor: shop.primaryColor,

          isActive: shop.isActive,
          trialDays: shop.trialDays,
          trialStartsAt: shop.trialStartsAt?.toISOString() || null,
          plan: shop.plan || "free",
          features: shop.features || null,
          paymentInfo: shop.paymentInfo || null,
          ownerNotes: shop.ownerNotes || null,
          orders: shop._count.orders,
          revenue: shopRevenue._sum.total || 0,
          todayOrders: shopToday,
          recentOrders: recentShopOrders.map((o) => ({
            id: o.id,
            reference: o.reference,
            serviceName: o.serviceName,
            status: o.status,
            total: o.total,
            customer: JSON.parse(o.customer),
            createdAt: o.createdAt,
          })),
        };
      })
    );

    // آخر 30 طلب عبر كل المتاجر
    const recentOrders = await db.printOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        shop: { select: { name: true, slug: true } },
      },
    });

    // توزيع الحالات
    const statusDistribution = await db.printOrder.groupBy({
      by: ["status"],
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const s of statusDistribution) {
      statusCounts[s.status] = s._count;
    }

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      todayOrders: todayOrdersResult,
      shopCount: shops.length,
      activeShopCount: shops.filter((s) => s.isActive).length,
      statusCounts,
      shopStats,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        options: JSON.parse(o.options),
        customer: JSON.parse(o.customer),
        delivery: JSON.parse(o.delivery),
        pricing: JSON.parse(o.pricing),
        smartAnalysis: o.smartAnalysis ? JSON.parse(o.smartAnalysis) : null,
        shopName: o.shop?.name || "—",
        shopSlug: o.shop?.slug || "",
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}