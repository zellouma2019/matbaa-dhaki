// محلل الملفات الحقيقي - يحلل محتوى الملف الفعلي而非 معلومات وهمية
"use client";

import type { ServiceType } from "@/lib/print-config";

// تحميل pdfjs-dist ديناميكياً (client-only) لتجنب أخطاء SSR
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
let workerInitialized = false;

async function ensurePdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
  }
  if (!workerInitialized) {
    try {
      // استخدام worker محلي من مجلد public (موثوق أكثر من CDN)
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      workerInitialized = true;
    } catch {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";
      } catch {}
    }
  }
  return pdfjsLib;
}

export interface RealFileAnalysis {
  detectedService: ServiceType;
  detectedServiceName: string;
  pageCount: number; // حقيقي من الملف
  fileSizeKB: number;
  fileSizeMB: number;
  suggestedColor: string;
  suggestedPaperSize: string;
  suggestedPaperType: string;
  suggestedBinding: string;
  confidence: number;
  insights: string[];
  fileType: string;
  fileName: string;
  // معلومات إضافية حقيقية
  imageDimensions?: { width: number; height: number; megapixels: number };
  pdfTitle?: string;
  pdfAuthor?: string;
  pdfCreator?: string;
  textPreview?: string; // أول 300 حرف من النص
  detectedLanguage?: string;
  // معاينة بصرية
  thumbnailUrl?: string; // معاينة مصغرة (للصور: الصورة نفسها، للـ PDF: أول صفحة)
  fileNature?: string; // وصف طبيعة الملف
  isPortrait?: boolean;
  dominantColors?: string[]; // ألوان سائدة (للصور)
}

/// تحليل حقيقي للملف بناءً على محتواه الفعلي
export async function analyzeFileReal(file: File): Promise<RealFileAnalysis> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const sizeBytes = file.size;
  const sizeKB = Math.round(sizeBytes / 1024);
  const sizeMB = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;

  if (ext === "pdf") {
    return analyzePdf(file, sizeKB, sizeMB);
  }
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return analyzeImage(file, ext, sizeKB, sizeMB);
  }
  if (ext === "docx" || ext === "doc") {
    return analyzeDocx(file, sizeKB, sizeMB);
  }
  // افتراضي
  return defaultAnalysis(file.name, ext, sizeKB, sizeMB);
}

/// تحليل PDF حقيقي باستخدام PDF.js
async function analyzePdf(
  file: File,
  sizeKB: number,
  sizeMB: number,
): Promise<RealFileAnalysis> {
  let pageCount = 1;
  let pdfTitle: string | undefined;
  let pdfAuthor: string | undefined;
  let pdfCreator: string | undefined;
  let textPreview = "";
  let thumbnailUrl: string | undefined;
  let fileNature: string | undefined;
  let isPortrait: boolean | undefined;
  const insights: string[] = [];

  try {
    const lib = await ensurePdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = lib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    pageCount = pdf.numPages; // العدد الحقيقي للصفحات

    // استخراج البيانات الوصفية
    try {
      const meta = await pdf.getMetadata();
      const info = meta?.info as Record<string, unknown> | undefined;
      if (info) {
        pdfTitle = (info.Title as string) || undefined;
        pdfAuthor = (info.Author as string) || undefined;
        pdfCreator = (info.Creator as string) || undefined;
      }
    } catch {}

    // استخراج النص من أول 3 صفحات لاكتشاف نوع المحتوى
    const pagesToRead = Math.min(3, pageCount);
    let fullText = "";
    for (let i = 1; i <= pagesToRead; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        fullText += " " + pageText;

        // توليد معاينة مصغرة من أول صفحة فقط
        if (i === 1) {
          try {
            const viewport = page.getViewport({ scale: 0.5 });
            isPortrait = viewport.height > viewport.width;
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            if (context) {
              await page.render({ canvasContext: context, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
              thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
            }
          } catch {}
        }
      } catch {}
    }
    textPreview = fullText.trim().substring(0, 300);

    // اكتشاف اللغة
    const arabicChars = (fullText.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (fullText.match(/[a-zA-Z]/g) || []).length;
    if (arabicChars > latinChars && arabicChars > 20) {
      insights.push("اللغة المكتشفة: عربية");
      fileNature = "مستند عربي";
    } else if (latinChars > 20) {
      insights.push("اللغة المكتشفة: أجنبية");
      fileNature = "مستند أجنبي";
    }
  } catch (e) {
    insights.push("تعذّر قراءة تفاصيل PDF — تم استخدام التقدير");
  }

  // اكتشاف نوع المحتوى من النص الفعلي والعنوان
  const searchText = `${file.name} ${pdfTitle || ""} ${textPreview}`.toLowerCase();
  const name = file.name.toLowerCase();
  let detectedService: ServiceType = "document";
  let confidence = 70;
  let suggestedColor = "bw";
  let suggestedPaperSize = "A4";
  let suggestedPaperType = "normal";
  let suggestedBinding = "none";
  let detectedServiceName = "طباعة مستند";

  // قواعد الاكتشاف من المحتوى الحقيقي
  if (/cv|resume|سيرة|ذاتية|curriculum/.test(searchText)) {
    detectedService = "document";
    detectedServiceName = "طباعة مستند (سيرة ذاتية)";
    confidence = 95;
    suggestedPaperType = "cardboard";
    suggestedColor = "bw";
    fileNature = "سيرة ذاتية";
    insights.push("سيرة ذاتية مكتشفة من المحتوى — ورق مقوّى أبيض وأسود");
  } else if (/report|تقرير|memo|مذكرة|search|بحث|study|دراسة|thesis|message|رسالة/.test(searchText)) {
    detectedService = "document";
    detectedServiceName = "طباعة مستند (تقرير/مذكرة)";
    confidence = 92;
    suggestedColor = "bw";
    fileNature = pageCount > 50 ? "بحث/أطروحة" : pageCount > 15 ? "تقرير طويل" : "تقرير/مذكرة";
    if (pageCount > 15) {
      suggestedBinding = "spiral";
      insights.push("مستند طويل — يُنصح بتجليد لولبي");
    }
    insights.push("مستند نصي — أبيض وأسود اقتصادي");
  } else if (/card|بطاقة|invite|دعوة|wedding|زفاف|business card|visite/.test(searchText)) {
    detectedService = "card";
    detectedServiceName = "بطاقات";
    confidence = 90;
    suggestedColor = "color";
    suggestedPaperType = "cardboard";
    fileNature = "بطاقة";
    insights.push("بطاقة مكتشفة — ورق مقوّى + طباعة ملونة");
  } else if (/poster|ملصق|affiche|flyer|إعلان|اعلان/.test(searchText)) {
    detectedService = "poster";
    detectedServiceName = "ملصقات";
    confidence = 89;
    suggestedColor = "color";
    suggestedPaperSize = "A3";
    suggestedPaperType = "glossy";
    fileNature = "ملصق/إعلان";
    insights.push("ملصق — حجم A3 + ورق لامع + طباعة ملونة");
  } else if (/invoice|فاتورة|receipt|وصل|quotation|عرض سعر/.test(searchText)) {
    detectedService = "document";
    detectedServiceName = "طباعة مستند (فاتورة)";
    confidence = 88;
    suggestedColor = "bw";
    fileNature = "فاتورة/وصل";
    insights.push("فاتورة/وصل — أبيض وأسود");
  } else {
    // اكتشاف عام من عدد الصفحات
    if (pageCount === 1) {
      confidence = 75;
      fileNature = "صفحة واحدة";
      insights.push("مستند PDF من صفحة واحدة");
    } else if (pageCount > 50) {
      confidence = 78;
      suggestedBinding = "glue";
      fileNature = "كتاب/بحث طويل";
      insights.push("مستند طويل جداً — يُنصح بتجليد بالغراء");
    } else {
      confidence = 80;
      fileNature = "مستند متعدد الصفحات";
      if (pageCount > 15) {
        suggestedBinding = "spiral";
        insights.push("مستند متوسط الطول — تجليد لولبي مقترح");
      }
    }
    insights.push("ملف PDF قياسي — الإعدادات الافتراضية");
  }

  insights.push(`عدد الصفحات الفعلي: ${pageCount} صفحة`);
  if (pdfTitle) insights.push(`العنوان: ${pdfTitle}`);
  if (pdfAuthor) insights.push(`المؤلف: ${pdfAuthor}`);
  if (pageCount > 0 && sizeMB > 0) {
    insights.push(`متوسط الحجم لكل صفحة: ${Math.round(sizeKB / pageCount)} ك.ب`);
  }

  return {
    detectedService,
    detectedServiceName,
    pageCount,
    fileSizeKB: sizeKB,
    fileSizeMB: sizeMB,
    suggestedColor,
    suggestedPaperSize,
    suggestedPaperType,
    suggestedBinding,
    confidence,
    insights,
    fileType: "PDF",
    fileName: file.name,
    pdfTitle,
    pdfAuthor,
    pdfCreator,
    textPreview,
    thumbnailUrl,
    fileNature,
    isPortrait,
  };
}

/// تحليل صورة حقيقي باستخدام واجهة المتصفح
async function analyzeImage(
  file: File,
  ext: string,
  sizeKB: number,
  sizeMB: number,
): Promise<RealFileAnalysis> {
  let width = 0;
  let height = 0;
  let thumbnailUrl: string | undefined;
  let dominantColors: string[] = [];
  let fileNature: string | undefined;
  const insights: string[] = [];

  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    width = img.naturalWidth;
    height = img.naturalHeight;

    // إنشاء معاينة مصغرة + استخراج الألوان السائدة
    try {
      const canvas = document.createElement("canvas");
      const maxThumb = 300;
      const scale = Math.min(maxThumb / width, maxThumb / height, 1);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

        // استخراج الألوان السائدة من عينة 10x10
        const sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = 10;
        sampleCanvas.height = 10;
        const sCtx = sampleCanvas.getContext("2d");
        if (sCtx) {
          sCtx.drawImage(img, 0, 0, 10, 10);
          const data = sCtx.getImageData(0, 0, 10, 10).data;
          const colorBuckets: Record<string, number> = {};
          for (let i = 0; i < data.length; i += 4) {
            const r = Math.round(data[i] / 64) * 64;
            const g = Math.round(data[i + 1] / 64) * 64;
            const b = Math.round(data[i + 2] / 64) * 64;
            const key = `${r},${g},${b}`;
            colorBuckets[key] = (colorBuckets[key] || 0) + 1;
          }
          const sorted = Object.entries(colorBuckets).sort((a, b) => b[1] - a[1]).slice(0, 3);
          dominantColors = sorted.map(([k]) => {
            const [r, g, b] = k.split(",").map(Number);
            // تجنّب الأبيض/الأسود الصافي
            const brightness = (r + g + b) / 3;
            if (brightness > 240) return "فاتح";
            if (brightness < 16) return "داكن";
            return `rgb(${r},${g},${b})`;
          });
        }
      }
    } catch {}

    URL.revokeObjectURL(url);
  } catch {
    insights.push("تعذّر قراءة أبعاد الصورة");
  }

  const megapixels = Math.round(((width * height) / 1000000) * 100) / 100;
  const isPortrait = height > width;
  const isLandscape = width > height;
  const isHighRes = megapixels > 8;

  const name = file.name.toLowerCase();
  let detectedService: ServiceType = "photo";
  let detectedServiceName = "طباعة صور";
  let confidence = 90;
  let suggestedColor = "color";
  let suggestedPaperSize = "A4";
  let suggestedPaperType = "glossy";
  let suggestedBinding = "none";

  // اكتشاف نوع الصورة من الاسم
  if (/passport|جواز|id|هوية|photo id|صورة شخصية/.test(name)) {
    detectedServiceName = "طباعة صور (صورة شخصية)";
    confidence = 93;
    suggestedPaperSize = "A5";
    suggestedPaperType = "glossy";
    fileNature = "صورة شخصية";
    insights.push("صورة شخصية — حجم A5 + ورق لامع");
  } else if (/poster|ملصق|affiche/.test(name)) {
    detectedService = "poster";
    detectedServiceName = "ملصقات";
    confidence = 91;
    suggestedPaperSize = "A3";
    fileNature = "ملصق";
    insights.push("ملصق — حجم A3");
  } else if (/wedding|زفاف|عرس/.test(name)) {
    fileNature = "صورة زفاف";
    suggestedPaperType = "premium";
    insights.push("صورة زفاف — ورق برو فاخر");
  } else {
    fileNature = "صورة";
    insights.push("صورة — طباعة ملونة على ورق لامع");
  }

  if (isPortrait) insights.push(`اتجاه عمودي (${width}×${height})`);
  else if (isLandscape) insights.push(`اتجاه أفقي (${width}×${height})`);
  else insights.push(`مربع (${width}×${height})`);

  if (isHighRes) {
    insights.push(`دقة عالية ${megapixels} ميجابكسل — جودة طباعة ممتازة`);
  } else if (megapixels < 1) {
    insights.push(`دقة منخفضة ${megapixels} ميجابكسل — قد تظهر بكسلية عند الطباعة الكبيرة`);
    confidence = Math.max(70, confidence - 10);
  } else {
    insights.push(`دقة ${megapixels} ميجابكسل`);
  }

  if (dominantColors.length > 0) {
    insights.push(`ألوان سائدة: ${dominantColors.join("، ")}`);
  }

  insights.push(`الحجم: ${sizeKB} ك.ب`);

  return {
    detectedService,
    detectedServiceName,
    pageCount: 1,
    fileSizeKB: sizeKB,
    fileSizeMB: sizeMB,
    suggestedColor,
    suggestedPaperSize,
    suggestedPaperType,
    suggestedBinding,
    confidence,
    insights,
    fileType: ext.toUpperCase(),
    fileName: file.name,
    imageDimensions: { width, height, megapixels },
    thumbnailUrl,
    fileNature,
    isPortrait,
    dominantColors,
  };
}

/// تحليل DOCX - يقدّر من الحجم (قراءة DOCX في المتصفح معقدة)
async function analyzeDocx(
  file: File,
  sizeKB: number,
  sizeMB: number,
): Promise<RealFileAnalysis> {
  // تقدير عدد الصفحات من حجم الملف (DOCX ~30KB/صفحة في المتوسط)
  const pageCount = Math.max(1, Math.min(500, Math.round(sizeKB / 30)));

  const name = file.name.toLowerCase();
  let detectedService: ServiceType = "document";
  let detectedServiceName = "طباعة مستند (Word)";
  let confidence = 82;
  let suggestedColor = "bw";
  let suggestedPaperSize = "A4";
  let suggestedPaperType = "normal";
  let suggestedBinding = "none";
  const insights: string[] = [];

  if (/cv|resume|سيرة|ذاتية/.test(name)) {
    detectedServiceName = "طباعة مستند (سيرة ذاتية Word)";
    confidence = 88;
    suggestedPaperType = "cardboard";
    insights.push("سيرة ذاتية محتملة — ورق مقوّى");
  } else if (/report|تقرير|مذكرة/.test(name)) {
    confidence = 85;
    if (pageCount > 15) suggestedBinding = "spiral";
    insights.push("تقرير/مذكرة — تجليد لولبي مقترح للمستندات الطويلة");
  }

  insights.push(`عدد الصفحات المقدّر: ${pageCount} (تقدير من حجم Word)`);
  insights.push("نصيحة: حوّل إلى PDF لتحليل أدق لعدد الصفحات");

  return {
    detectedService,
    detectedServiceName,
    pageCount,
    fileSizeKB: sizeKB,
    fileSizeMB: sizeMB,
    suggestedColor,
    suggestedPaperSize,
    suggestedPaperType,
    suggestedBinding,
    confidence,
    insights,
    fileType: "DOCX",
    fileName: file.name,
  };
}

function defaultAnalysis(
  fileName: string,
  ext: string,
  sizeKB: number,
  sizeMB: number,
): RealFileAnalysis {
  return {
    detectedService: "document",
    detectedServiceName: "طباعة مستند",
    pageCount: 1,
    fileSizeKB: sizeKB,
    fileSizeMB: sizeMB,
    suggestedColor: "bw",
    suggestedPaperSize: "A4",
    suggestedPaperType: "normal",
    suggestedBinding: "none",
    confidence: 60,
    insights: [
      `نوع الملف: ${ext.toUpperCase()}`,
      `عدد الصفحات المقدّر: 1`,
      "اختر الخدمة والإعدادات يدوياً",
    ],
    fileType: ext.toUpperCase(),
    fileName,
  };
}

/// تحليل نطاق الصفحات (مثل "1-5, 8, 10-12") وإرجاع العدد الفعلي
export function parsePageRange(range: string, totalPages: number): number {
  if (!range.trim()) return totalPages;
  const parts = range.split(",").map((p) => p.trim()).filter(Boolean);
  const pages = new Set<number>();
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(totalPages, Math.max(start, end));
        for (let i = s; i <= e; i++) pages.add(i);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= totalPages) pages.add(n);
    }
  }
  return pages.size > 0 ? pages.size : totalPages;
}
