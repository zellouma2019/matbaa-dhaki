import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import {
  COLORS,
  PAPER_SIZES,
  SIDES,
  BINDINGS,
  PAPER_TYPES,
  DELIVERY_OPTIONS,
  formatDA,
  formatDateTimeAr,
} from "@/lib/print-config";

const serviceNamesAr: Record<string, string> = {
  document: "طباعة مستند",
  photo: "طباعة صور",
  binding: "تجليد",
  copy: "نسخ مستندات",
  card: "بطاقات",
  poster: "ملصقات",
};

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(req, "invoice");
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

    // جلب بيانات المتجر للشعار والألوان
    const effectiveShopId = order.shopId || shopId;
    const shopData = effectiveShopId
      ? await db.shop.findUnique({ where: { id: effectiveShopId } })
      : null;

    const shopName = shopData?.name || "المتجر";
    const shopPhone = shopData?.phone || "";
    const shopEmail = shopData?.email || "";
    const shopAddress = shopData?.address || "";
    const shopLogoUrl = shopData?.logoUrl || "";
    const primaryColor = shopData?.primaryColor || "#d4af37";

    let options: Record<string, string> = {};
    let customer: Record<string, string> = {};
    let delivery: Record<string, string> = {};
    let pricing: Record<string, number> = {};
    try { options = JSON.parse(order.options || "{}") || {}; } catch {}
    try { customer = JSON.parse(order.customer || "{}") || {}; } catch {}
    try { delivery = JSON.parse(order.delivery || "{}") || {}; } catch {}
    try { pricing = JSON.parse(order.pricing || "{}") || {}; } catch {}

    const serviceName = serviceNamesAr[order.serviceType] || order.serviceName || "طباعة";
    const color = COLORS.find((c) => c.id === options.color);
    const sides = SIDES.find((s) => s.id === options.sides);
    const binding = BINDINGS.find((b) => b.id === options.binding);
    const paperType = PAPER_TYPES.find((p) => p.id === options.paperType);
    const deliv = DELIVERY_OPTIONS.find((d) => d.id === delivery.mode);

    const dateStr = formatDateTimeAr(order.createdAt?.toISOString() || new Date().toISOString());

    // Build pricing rows
    const pPerPage = Number(pricing.perPage) || 0;
    const pCopiesCost = Number(pricing.copiesCost) || 0;
    const pSidesSaving = Number(pricing.sidesSaving) || 0;
    const pBindingCost = Number(pricing.bindingCost) || 0;
    const pDeliveryCost = Number(pricing.deliveryCost) || 0;
    const pDiscount = Number(pricing.discount) || 0;
    const pTotal = Number(pricing.total) || 0;

    const pricingRows: [string, string][] = [
      [
        `طباعة (${order.pages} صفحة × ${order.copies} نسخة @ ${pPerPage} دج)`,
        formatDA(pCopiesCost),
      ],
    ];
    if (pSidesSaving > 0)
      pricingRows.push(["توفير الوجهين", `− ${formatDA(pSidesSaving)}`]);
    if (pBindingCost > 0)
      pricingRows.push(["التجليد", formatDA(pBindingCost)]);
    if (pDeliveryCost > 0)
      pricingRows.push(["توصيل عاجل", formatDA(pDeliveryCost)]);
    if (pDiscount > 0)
      pricingRows.push(["خصم الكمية", `− ${formatDA(pDiscount)}`]);

    const pricingRowsHtml = pricingRows
      .map(
        ([desc, amt], i) => `
      <tr style="background:${i % 2 === 0 ? "#faf8f0" : "#fff"}">
        <td style="padding:10px 16px;font-size:14px;border-bottom:1px solid #e5e0d0;">${esc(desc)}</td>
        <td style="padding:10px 16px;font-size:14px;text-align:left;font-weight:600;border-bottom:1px solid #e5e0d0;direction:ltr;">${esc(amt)}</td>
      </tr>`,
      )
      .join("\n");

    // شعار: صورة مخصصة أو أيقونة افتراضية
    const logoInitials = shopName.slice(0, 2);
    const logoHtml = shopLogoUrl
      ? `<img src="${esc(shopLogoUrl)}" alt="${esc(shopName)}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;" />`
      : `<div style="width:56px;height:56px;background:${esc(primaryColor)};border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#1a1a1a;letter-spacing:-1px;">${esc(logoInitials)}</div>`;

    // شريط الاتصال
    const contactItems: string[] = [];
    if (shopEmail) contactItems.push(`<span>📧 ${esc(shopEmail)}</span>`);
    if (shopPhone) contactItems.push(`<span>📱 ${esc(shopPhone)}</span>`);
    if (shopAddress) contactItems.push(`<span>📍 ${esc(shopAddress)}</span>`);
    const contactBarHtml = contactItems.length > 0
      ? `<div style="background:#f8f6f0;border-bottom:2px solid ${esc(primaryColor)};padding:10px 40px;display:flex;justify-content:center;gap:32px;font-size:12px;color:#666;">${contactItems.join("\n    ")}</div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>فاتورة ${esc(order.reference)} — ${esc(shopName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
    background: #f5f3ee;
    color: #1a1a1a;
    direction: rtl;
    -webkit-font-smoothing: antialiased;
  }

  .page {
    max-width: 210mm;
    margin: 0 auto;
    background: #fff;
    min-height: 100vh;
  }

  /* ===== Header ===== */
  .header {
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    color: #fff;
    padding: 32px 40px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header-logo {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-text h1 {
    font-size: 24px;
    font-weight: 800;
    color: ${esc(primaryColor)};
    line-height: 1.2;
  }
  .logo-text p {
    font-size: 13px;
    color: #ccc;
    margin-top: 2px;
  }
  .header-right {
    text-align: left;
  }
  .header-right h2 {
    font-size: 28px;
    font-weight: 900;
    color: ${esc(primaryColor)};
    letter-spacing: 1px;
  }
  .header-right .ref {
    font-size: 13px;
    color: #bbb;
    margin-top: 4px;
    direction: ltr;
    text-align: left;
  }
  .header-right .date {
    font-size: 13px;
    color: #999;
    margin-top: 2px;
  }

  /* ===== Contact Bar ===== */
  .contact-bar span { display:flex; align-items:center; gap:6px; }

  /* ===== Content ===== */
  .content { padding: 32px 40px; }

  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid ${esc(primaryColor)};
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title .icon {
    width: 28px; height: 28px;
    background: ${esc(primaryColor)};
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  /* Grid for customer + order details */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 28px;
  }

  .info-card {
    border: 1px solid #e5e0d0;
    border-radius: 12px;
    padding: 20px;
    background: #fff;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid #f0ece0;
    font-size: 13px;
  }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #888; font-weight: 600; }
  .info-value { color: #1a1a1a; font-weight: 600; direction: auto; }

  /* ===== Pricing Table ===== */
  .pricing-section { margin-bottom: 28px; }

  table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e5e0d0;
  }
  thead th {
    background: #1a1a1a;
    color: ${esc(primaryColor)};
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 700;
    text-align: right;
  }
  thead th:last-child { text-align: left; }
  tbody td { border-bottom: 1px solid #e5e0d0; }

  .total-row {
    background: ${esc(primaryColor)} !important;
  }
  .total-row td {
    padding: 14px 16px !important;
    font-size: 18px !important;
    font-weight: 800 !important;
    color: #1a1a1a !important;
    border-bottom: none !important;
  }
  .total-row td:last-child { text-align: left !important; }

  /* ===== Notes ===== */
  .notes {
    background: #faf8f0;
    border: 1px solid #e5e0d0;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 28px;
    font-size: 12px;
    color: #777;
    line-height: 2;
  }
  .notes strong { color: #555; }

  /* ===== Footer ===== */
  .footer {
    background: #1a1a1a;
    color: ${esc(primaryColor)};
    text-align: center;
    padding: 18px 40px;
    font-size: 13px;
  }
  .footer p { margin: 3px 0; }
  .footer .addr { color: #888; font-size: 11px; }

  /* ===== Print Button ===== */
  .print-btn-wrap {
    text-align: center;
    padding: 24px;
  }
  .print-btn {
    background: #1a1a1a;
    color: ${esc(primaryColor)};
    border: none;
    padding: 14px 40px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    font-family: 'Cairo', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }
  .print-btn:hover {
    background: #2a2a2a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  /* ===== Print Styles ===== */
  @media print {
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    body {
      background: #fff !important;
    }
    .page {
      max-width: none !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    .print-btn-wrap {
      display: none !important;
    }
    .header { padding: 20px 0; }
    .contact-bar { padding: 8px 0; }
    .content { padding: 20px 0; }
    .footer { padding: 14px 0; }
    .info-card { break-inside: avoid; }
    table { break-inside: avoid; }
    .notes { break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      ${logoHtml}
      <div class="logo-text">
        <h1>${esc(shopName)}</h1>
        <p>خدمة طباعة احترافية</p>
      </div>
    </div>
    <div class="header-right">
      <h2>فاتورة</h2>
      <div class="ref">رقم المرجع: ${esc(order.reference)}</div>
      <div class="date">${esc(dateStr)}</div>
    </div>
  </div>

  <!-- Contact Bar -->
  ${contactBarHtml}

  <!-- Content -->
  <div class="content">

    <!-- Customer + Order Details -->
    <div class="two-col">
      <!-- Customer -->
      <div class="info-card">
        <div class="section-title">
          <span class="icon">👤</span>
          بيانات العميل
        </div>
        <div class="info-row">
          <span class="info-label">الاسم</span>
          <span class="info-value">${esc(customer.name)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الهاتف</span>
          <span class="info-value" dir="ltr" style="text-align:left">${esc(customer.phone)}</span>
        </div>
        ${customer.whatsapp ? `
        <div class="info-row">
          <span class="info-label">واتساب</span>
          <span class="info-value" dir="ltr" style="text-align:left">${esc(customer.whatsapp)}</span>
        </div>` : ""}
        ${customer.email ? `
        <div class="info-row">
          <span class="info-label">البريد الإلكتروني</span>
          <span class="info-value" dir="ltr" style="text-align:left">${esc(customer.email)}</span>
        </div>` : ""}
        ${customer.deliveryMethod === "delivery" && customer.address ? `
        <div class="info-row">
          <span class="info-label">العنوان</span>
          <span class="info-value">${esc(customer.address)}</span>
        </div>` : ""}
      </div>

      <!-- Order Details -->
      <div class="info-card">
        <div class="section-title">
          <span class="icon">📋</span>
          تفاصيل الطلب
        </div>
        <div class="info-row">
          <span class="info-label">الخدمة</span>
          <span class="info-value">${esc(serviceName)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الصفحات</span>
          <span class="info-value">${order.pages} صفحة</span>
        </div>
        <div class="info-row">
          <span class="info-label">النسخ</span>
          <span class="info-value">${order.copies} نسخة</span>
        </div>
        <div class="info-row">
          <span class="info-label">اللون</span>
          <span class="info-value">${esc(color ? color.label : options.color)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">حجم الورق</span>
          <span class="info-value">${esc(options.paperSize || "A4")}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الوجهين</span>
          <span class="info-value">${esc(sides ? sides.label : options.sides)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">التجليد</span>
          <span class="info-value">${esc(binding ? binding.label : options.binding)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">نوع الورق</span>
          <span class="info-value">${esc(paperType ? paperType.label : options.paperType)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">التسليم</span>
          <span class="info-value">${esc(deliv ? deliv.label : delivery.mode)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الوقت المتوقع</span>
          <span class="info-value">${order.estimatedHours} ساعة</span>
        </div>
        ${order.fileName ? `
        <div class="info-row">
          <span class="info-label">الملف</span>
          <span class="info-value" dir="ltr" style="text-align:left">${esc(order.fileName)}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Pricing Table -->
    <div class="pricing-section">
      <div class="section-title">
        <span class="icon">💰</span>
        تفاصيل التسعير
      </div>
      <table>
        <thead>
          <tr>
            <th>الوصف</th>
            <th>المبلغ (دج)</th>
          </tr>
        </thead>
        <tbody>
          ${pricingRowsHtml}
          <tr class="total-row">
            <td>المجموع</td>
            <td style="text-align:left;direction:ltr">${pTotal.toLocaleString("en-US")} دج</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Notes -->
    <div class="notes">
      <strong>ملاحظات:</strong><br>
      * هذه الفاتورة تقديرية. يتم تأكيد السعر النهائي بعد مراجعة الملف.<br>
      * سنتواصل معك قبل بدء الطباعة.<br>
      * احتفظ برقم المرجع لتتبع الطلب.
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>${esc(shopName)}</strong></p>
    ${shopAddress ? `<p class="addr">${esc(shopAddress)}${shopPhone ? ` · ${esc(shopPhone)}` : ""}</p>` : (shopPhone ? `<p class="addr">${esc(shopPhone)}</p>` : "")}
  </div>

  <!-- Print Button (hidden in print) -->
  <div class="print-btn-wrap">
    <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  </div>
</div>

<script>
  // Auto-trigger print on load (small delay for font loading)
  window.onload = function() {
    setTimeout(function(){ window.print(); }, 600);
  };
</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${order.reference}.html"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}