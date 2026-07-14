"use client";

import jsPDF from "jspdf";
import { toast } from "sonner";

/**
 * تحويل فاتورة HTML إلى ملف PDF وتنزيلها مباشرة
 * يستخدم jsPDF.html() لعرض HTML بتنسيقه الكامل (خطوط عربية، RTL)
 */
export async function downloadInvoicePDF(orderId: string, reference?: string): Promise<boolean> {
  try {
    toast.loading("جارٍ إنشاء ملف PDF...", { id: "pdf-invoice" });

    // 1. جلب HTML الفاتورة
    const res = await fetch(`/api/orders/${orderId}/invoice`);
    if (!res.ok) throw new Error("فشل في جلب الفاتورة");
    let html = await res.text();

    // 2. تنظيف HTML — إزالة زر الطباعة والسكريبت التلقائي
    html = html.replace(/<button class="print-btn[^"]*">[^<]*<\/button>/g, "");
    html = html.replace(/<script>window\.onload[\s\S]*?<\/script>/g, "");
    // إزالة @media print لمنع إخفاء العناصر
    html = html.replace(/@media\s*print\s*\{[^}]*\}/g, "");
    // إزالة no-print من العناصر لتظهر في PDF
    html = html.replace(/no-print/g, "");

    // 3. إنشاء مستند PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // 4. عرض HTML في PDF
    await doc.html(html, {
      x: 0,
      y: 0,
      width: 210, // A4 عرض بالمليمتر
      windowWidth: 820, // يطابق max-width في CSS
      autoPaging: true,
      margin: [0, 0, 0, 0],
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        allowTaint: true,
      },
      callback: (pdfDoc) => {
        const fileName = reference
          ? `فاتورة-${reference}.pdf`
          : `فاتورة-${orderId.slice(0, 8)}.pdf`;
        pdfDoc.save(fileName);
      },
    });

    toast.success("تم تنزيل الفاتورة بنجاح", {
      id: "pdf-invoice",
      description: "ملف PDF جاهز للطباعة والمشاركة",
    });
    return true;
  } catch (error) {
    console.error("[PDF Invoice Error]", error);
    toast.error("فشل في إنشاء PDF", {
      id: "pdf-invoice",
      description: "سيتم فتح صفحة الطباعة بدلاً من ذلك",
    });
    // العودة للطريقة القديمة
    window.open(`/api/orders/${orderId}/invoice`, "_blank");
    return false;
  }
}