import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { runAutoCleanup } from "@/lib/cleanup";
import {
  generateReference,
  calculatePricing,
  estimateDeliveryHours,
  SERVICE_MAP,
  type ServiceType,
} from "@/lib/print-config";

export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "orders");
  if (!rl.ok) return rl.response;
  try {
    // صيانة تلقائية: حذف الطلبات older than 10 days
    await runAutoCleanup();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const phone = searchParams.get("phone");
    const shopId = searchParams.get("shopId");

    const where: Record<string, unknown> = {};
    if (shopId) where.shopId = shopId;
    if (status && status !== "all") where.status = status;
    if (phone) {
      // البحث برقم الهاتف في حقل customer (JSON)
      where.customer = { contains: phone };
    }
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { customer: { contains: search } },
      ];
    }

    const orders = await db.printOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        options: JSON.parse(o.options),
        customer: JSON.parse(o.customer),
        delivery: JSON.parse(o.delivery),
        pricing: JSON.parse(o.pricing),
        smartAnalysis: o.smartAnalysis ? JSON.parse(o.smartAnalysis) : null,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rl = withRateLimit(req, "orders");
  if (!rl.ok) return rl.response;
  try {
    const body = await req.json();
    const {
      serviceType,
      fileName,
      fileType,
      fileSize,
      smartAnalysis,
      options,
      customer,
      delivery,
      shopId,
    } = body;

    const service = SERVICE_MAP[serviceType as ServiceType];
    if (!service) {
      return NextResponse.json({ error: "خدمة غير صالحة" }, { status: 400 });
    }

    const pages = Number(options.pages) || 1;
    const copies = Number(options.copies) || 1;
    const pricing = calculatePricing({
      serviceType: serviceType as ServiceType,
      pages,
      copies,
      color: options.color,
      paperSize: options.paperSize,
      sides: options.sides,
      binding: options.binding,
      paperType: options.paperType,
      delivery: delivery.mode,
    });
    const estimatedHours = estimateDeliveryHours(delivery.mode, pages, copies);

    let reference = generateReference();
    let exists = await db.printOrder.findUnique({ where: { reference } });
    while (exists) {
      reference = generateReference();
      exists = await db.printOrder.findUnique({ where: { reference } });
    }

    const order = await db.printOrder.create({
      data: {
        reference,
        serviceType,
        serviceName: service.name,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        smartAnalysis: smartAnalysis ? JSON.stringify(smartAnalysis) : null,
        options: JSON.stringify(options),
        customer: JSON.stringify(customer),
        delivery: JSON.stringify(delivery),
        pricing: JSON.stringify(pricing),
        estimatedHours,
        status: "pending",
        pages,
        copies,
        total: pricing.total,
        ...(shopId ? { shopId } : {}),
      },
    });

    return NextResponse.json({
      ...order,
      options: JSON.parse(order.options),
      customer: JSON.parse(order.customer),
      delivery: JSON.parse(order.delivery),
      pricing: JSON.parse(order.pricing),
      smartAnalysis: order.smartAnalysis ? JSON.parse(order.smartAnalysis) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
