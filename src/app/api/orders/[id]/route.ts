import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-auth";
import { addAuditLog } from "@/lib/audit";
import { STATUS_META, calculatePricing, estimateDeliveryHours } from "@/lib/print-config";
import type { ServiceType } from "@/lib/print-config";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "order-detail");
  if (!rl.ok) return rl.response;
  try {
    const { id } = await params;
    const shopId = req.nextUrl.searchParams.get("shopId");
    const order = shopId
      ? await db.printOrder.findFirst({ where: { id, shopId } })
      : await db.printOrder.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "order-detail");
  if (!rl.ok) return rl.response;
  const { authorized, error: authError } = await requireAdmin(req);
  if (!authorized) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const shopId = body.shopId || req.nextUrl.searchParams.get("shopId");

    const existing = shopId
      ? await db.printOrder.findFirst({ where: { id, shopId } })
      : await db.printOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    // ===== تعديل حقول الطلب =====
    if (body.action === "edit") {
      const updateData: Record<string, unknown> = {};
      const auditEntries: Array<{ field: string; oldValue: string; newValue: string }> = [];

      // حقول العميل (دمج جزئي)
      if (body.customer) {
        const oldCustomer = JSON.parse(existing.customer);
        const newCustomer = { ...oldCustomer, ...body.customer };
        updateData.customer = JSON.stringify(newCustomer);
        for (const key of Object.keys(body.customer)) {
          if (String(oldCustomer[key]) !== String(body.customer[key])) {
            auditEntries.push({
              field: `customer.${key}`,
              oldValue: String(oldCustomer[key] || ""),
              newValue: String(body.customer[key]),
            });
          }
        }
      }

      if (body.adminNotes !== undefined) {
        updateData.adminNotes = body.adminNotes;
        if (existing.adminNotes !== body.adminNotes) {
          auditEntries.push({
            field: "adminNotes",
            oldValue: existing.adminNotes || "",
            newValue: body.adminNotes,
          });
        }
      }

      if (body.tags !== undefined) {
        updateData.tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags);
      }

      if (body.cost !== undefined) {
        updateData.cost = Number(body.cost);
      }

      // إعادة حساب الأسعار إذا تغيرت النسخ أو الصفحات
      const oldOptions = JSON.parse(existing.options);
      let needsPriceRecalc = false;
      if (body.copies !== undefined && body.copies !== existing.copies) {
        updateData.copies = Number(body.copies);
        needsPriceRecalc = true;
        auditEntries.push({
          field: "copies",
          oldValue: String(existing.copies),
          newValue: String(body.copies),
        });
      }
      if (body.pages !== undefined && body.pages !== existing.pages) {
        updateData.pages = Number(body.pages);
        needsPriceRecalc = true;
        auditEntries.push({
          field: "pages",
          oldValue: String(existing.pages),
          newValue: String(body.pages),
        });
      }

      if (needsPriceRecalc) {
        const pricing = calculatePricing({
          serviceType: existing.serviceType as ServiceType,
          pages: (updateData.pages as number) || existing.pages,
          copies: (updateData.copies as number) || existing.copies,
          color: oldOptions.color,
          paperSize: oldOptions.paperSize,
          sides: oldOptions.sides,
          binding: oldOptions.binding,
          paperType: oldOptions.paperType,
          delivery: JSON.parse(existing.delivery)?.mode,
        });
        updateData.total = pricing.total;
        updateData.pricing = JSON.stringify(pricing);
        updateData.estimatedHours = estimateDeliveryHours(
          JSON.parse(existing.delivery)?.mode,
          (updateData.pages as number) || existing.pages,
          (updateData.copies as number) || existing.copies,
        );
      }

      const updated = await db.printOrder.update({ where: { id }, data: updateData });

      // تسجيل كل التغييرات في السجل
      for (const entry of auditEntries) {
        await addAuditLog({
          orderId: id,
          action: "edit",
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          details: `${existing.reference} — تعديل ${entry.field}`,
        });
      }

      return NextResponse.json({
        ...updated,
        options: JSON.parse(updated.options),
        customer: JSON.parse(updated.customer),
        delivery: JSON.parse(updated.delivery),
        pricing: JSON.parse(updated.pricing),
      });
    }

    // ===== تغيير الحالة =====
    const { status } = body;
    const oldStatus = existing.status;
    const updateData: Record<string, unknown> = { status };
    if (status === "printing" && !existing.startedPrintingAt) updateData.startedPrintingAt = new Date();
    if (status === "ready" && !existing.readyAt) updateData.readyAt = new Date();
    if (status === "ready" && !existing.completedPrintingAt) updateData.completedPrintingAt = new Date();
    if (status === "delivered" && !existing.deliveredAt) updateData.deliveredAt = new Date();

    const order = await db.printOrder.update({
      where: { id },
      data: updateData,
    });

    await addAuditLog({
      orderId: id,
      action: "status_change",
      field: "status",
      oldValue: oldStatus,
      newValue: status,
      details: `${existing.reference} → ${STATUS_META[status]?.label || status}`,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "order-detail");
  if (!rl.ok) return rl.response;
  const { authorized, error: authError } = await requireAdmin(req);
  if (!authorized) return authError;

  try {
    const { id } = await params;
    const shopId = req.nextUrl.searchParams.get("shopId");
    if (shopId) {
      const existing = await db.printOrder.findFirst({ where: { id, shopId } });
      if (!existing) {
        return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      }
      await addAuditLog({
        orderId: id,
        action: "delete",
        details: `حذف طلب ${existing.reference}`,
      });
    }
    await db.printOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}