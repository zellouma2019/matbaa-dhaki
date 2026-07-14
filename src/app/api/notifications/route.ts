import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

interface Notification {
  id: string;
  type: "new_order" | "status_change" | "stale_order" | "system";
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export async function GET(request: Request) {
  const { authorized, error: authError } = await requireAdmin(request);
  if (!authorized) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get new orders since
    const newOrders = await db.printOrder.findMany({
      where: { createdAt: { gte: sinceDate } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const notifications: Notification[] = newOrders.map((o) => {
      const customer = JSON.parse(o.customer as string) as { name?: string };
      return {
        id: `new-${o.id}`,
        type: "new_order" as const,
        title: "طلب جديد",
        body: `${customer.name || "عميل"} — ${o.serviceName} — ${o.reference}`,
        orderId: o.id,
        read: false,
        createdAt: o.createdAt.toISOString(),
      };
    });

    // Check for stale orders (pending > 2 hours or printing > 4 hours)
    const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleOrders = await db.printOrder.findMany({
      where: {
        status: { in: ["pending", "printing"] },
        createdAt: { lt: staleThreshold },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    staleOrders.forEach((o) => {
      notifications.push({
        id: `stale-${o.id}`,
        type: "stale_order",
        title: "طلب متأخر",
        body: `${o.reference} — ${o.status === "pending" ? "لم يُبدأ بعد" : "قيد الطباعة منذ فترة"}`,
        orderId: o.id,
        read: false,
        createdAt: o.updatedAt.toISOString(),
      });
    });

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ notifications: notifications.slice(0, 30) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}