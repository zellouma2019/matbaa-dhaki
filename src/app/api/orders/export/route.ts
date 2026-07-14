import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import * as XLSX from "xlsx";
import { STATUS_META } from "@/lib/print-config";

// Translation map for service types
const SERVICE_NAMES: Record<string, string> = {
  document: "وثائق",
  photo: "صور",
  binding: "تجليد",
  copy: "نسخ",
  card: "بطاقات",
  poster: "ملصقات",
};

export async function POST(request: Request) {
  const { authorized, error: authError } = await requireAdmin(request);
  if (!authorized) return authError;

  try {
    const orders = await db.printOrder.findMany({
      orderBy: { createdAt: "desc" },
    });

    // === Sheet 1: Orders ===
    const orderRows = orders.map((o) => {
      let customerName = "—";
      let customerPhone = "—";
      try {
        const c = JSON.parse(o.customer);
        customerName = c.name || "—";
        customerPhone = c.phone || "—";
      } catch { /* skip */ }

      return {
        "المرجع": o.reference,
        "الخدمة": o.serviceName || SERVICE_NAMES[o.serviceType] || o.serviceType,
        "العميل": customerName,
        "الهاتف": customerPhone,
        "الصفحات": o.pages,
        "النسخ": o.copies,
        "المبلغ (دج)": o.total,
        "الحالة": STATUS_META[o.status]?.label || o.status,
        "التاريخ": o.createdAt.toLocaleDateString("ar-DZ"),
        "ملاحظات": o.adminNotes || "",
      };
    });

    // === Sheet 2: Statistics ===
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = orders.filter((o) => new Date(o.createdAt) >= todayStart).length;

    const statusStats: Record<string, number> = {};
    orders.forEach((o) => { statusStats[o.status] = (statusStats[o.status] || 0) + 1; });

    const statsRows = [
      { "المقياس": "إجمالي الطلبات", "القيمة": orders.length },
      { "المقياس": "إجمالي الإيرادات (دج)", "القيمة": totalRevenue },
      { "المقياس": "تم التسليم", "القيمة": delivered },
      { "المقياس": "طلبات اليوم", "القيمة": todayCount },
      { "المقياس": "متوسط قيمة الطلب (دج)", "القيمة": orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0 },
      { "المقياس": "نسبة التسليم %", "القيمة": orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0 },
      { "المقياس": "", "القيمة": "" },
      { "المقياس": "حسب الحالة", "القيمة": "" },
      ...Object.entries(statusStats).map(([status, count]) => ({
        "المقياس": STATUS_META[status]?.label || status,
        "القيمة": count,
      })),
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Orders sheet
    const ws1 = XLSX.utils.json_to_sheet(orderRows);
    // Set column widths
    ws1["!cols"] = [
      { wch: 12 }, // المرجع
      { wch: 14 }, // الخدمة
      { wch: 20 }, // العميل
      { wch: 14 }, // الهاتف
      { wch: 8 },  // الصفحات
      { wch: 8 },  // النسخ
      { wch: 14 }, // المبلغ
      { wch: 12 }, // الحالة
      { wch: 14 }, // التاريخ
      { wch: 20 }, // ملاحظات
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "الطلبات");

    // Stats sheet
    const ws2 = XLSX.utils.json_to_sheet(statsRows);
    ws2["!cols"] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, "إحصائيات");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent("تقرير-الطلبات.xlsx"),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}