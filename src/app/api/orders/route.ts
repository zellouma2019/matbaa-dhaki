import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { runAutoCleanup } from "@/lib/cleanup";
import fs from "fs";
import path from "path";

/// قراءة ملف مخزَّن على القرص وتحويله إلى Data URL (للصور فقط)
function getFilePreview(storedName: string, fileType: string | null): string | null {
  try {
    if (!storedName || !storedName.startsWith("file_")) return null;
    // فقط للصور — لا نعيد PDFs كـ Data URL (حجم كبير)
    const imageTypes = ["PNG", "JPG", "JPEG", "WEBP", "GIF"];
    if (fileType && !imageTypes.includes(fileType.toUpperCase())) return null;

    const filePath = path.join(process.cwd(), "uploads", storedName);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = storedName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    };
    const mime = mimeTypes[ext] || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(10000, Math.max(1, rawLimit));
    const noPreview = searchParams.get("noPreview") === "true";

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

    const [orders, total] = await Promise.all([
      db.printOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.printOrder.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => {
        // للصور فقط، أضف filePreview كـ Data URL للمعاينة
        const filePreview = noPreview ? null : o.fileData ? getFilePreview(o.fileData, o.fileType) : null;
        let parsedTags: string[] = [];
        try { parsedTags = JSON.parse(o.tags || "[]"); } catch { parsedTags = []; }
        // تأمين تحليل JSON مع قيم افتراضية
        let parsedCustomer = { name: "", phone: "", deliveryMethod: "pickup" };
        try { parsedCustomer = { ...parsedCustomer, ...JSON.parse(o.customer || "{}") }; } catch { /* keep default */ }
        let parsedOptions = { pages: 1, copies: 1, color: "", paperSize: "", sides: "", binding: "", paperType: "", printRange: "all" };
        try { parsedOptions = { ...parsedOptions, ...JSON.parse(o.options || "{}") }; } catch { /* keep default */ }
        let parsedDelivery = { mode: "pickup", date: "" };
        try { parsedDelivery = { ...parsedDelivery, ...JSON.parse(o.delivery || "{}") }; } catch { /* keep default */ }
        let parsedPricing = { perPage: 0, pagesCost: 0, copiesCost: 0, sidesSaving: 0, deliveryCost: 0, discount: 0, total: 0 };
        try { parsedPricing = { ...parsedPricing, ...JSON.parse(o.pricing || "{}") }; } catch { /* keep default */ }
        return {
          ...o,
          options: parsedOptions,
          customer: parsedCustomer,
          delivery: parsedDelivery,
          pricing: parsedPricing,
          smartAnalysis: o.smartAnalysis ? JSON.parse(o.smartAnalysis) : null,
          tags: parsedTags,
          filePreview,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
      fileData,
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
        fileData: fileData || null,
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