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
      // تحميل worker من CDN لتقليل حجم المشروع
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs";
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
  // ===== معلومات تفصيلية جديدة =====
  // أبعاد الصفحة بالملم
  pageDimensionsMM?: { width: number; height: number };
  // حجم الورق القياسي الأقرب
  closestPaperSize?: string; // "A4", "A3", "A5", "Letter", "مخصص"
  // DPI المقدّر
  estimatedDPI?: number;
  // فئة الدقة
  dpiCategory?: "منخفضة" | "متوسطة" | "عالية" | "جاهزة للطباعة";
  // المساحة اللونية
  colorSpace?: "RGB" | "CMYK" | "تدرج رمادي" | "غير محدد";
  // هل يحتوي صور؟
  hasImages?: boolean;
  // هل يحتوي نصوص؟
  hasText?: boolean;
  // نسبة العرض للارتفاع
  aspectRatio?: string; // "4:3", "16:9", "1:1" ...
  // اتجاه الصفحة
  orientation?: "عمودي" | "أفقي" | "مربع";
  // الحجم المنسّق
  fileSizeFormatted?: string;
}

// ===== مقاسات الأوراق القياسية بالملم =====
const PAPER_SIZES_MM: Record<string, { w: number; h: number }> = {
  A6: { w: 105, h: 148 },
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A3_PLUS: { w: 329, h: 483 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
};

/// إيجاد أقرب حجم ورقي قياسي من الأبعاد بالملم
function findClosestPaperSize(wMM: number, hMM: number): { name: string; tolerance: number } {
  let bestName = "مخصص";
  let bestTolerance = Infinity;

  for (const [name, dims] of Object.entries(PAPER_SIZES_MM)) {
    // جرب الاتجاهين (عمودي وأفقي)
    for (const [dw, dh] of [[dims.w, dims.h], [dims.h, dims.w]]) {
      const diffW = Math.abs(wMM - dw);
      const diffH = Math.abs(hMM - dh);
      const tolerance = diffW + diffH;
      if (tolerance < bestTolerance) {
        bestTolerance = tolerance;
        bestName = name;
      }
    }
  }

  // إذا كان الفرق كبيراً، نعتبره مخصص
  if (bestTolerance > 20) return { name: "مخصص", tolerance: bestTolerance };
  return { name: bestName, tolerance: bestTolerance };
}

/// تقدير DPI من أبعاد الصورة وعرض الورقة الهدف (بالمم)
function estimateDPI(imageWidth: number, imageHeight: number, paperWidthMM: number, paperHeightMM: number): number {
  // DPI = بكسل / إنش (1 إنش = 25.4 مم)
  const dpiW = Math.round((imageWidth / paperWidthMM) * 25.4);
  const dpiH = Math.round((imageHeight / paperHeightMM) * 25.4);
  return Math.round((dpiW + dpiH) / 2);
}

/// تصنيف الدقة
function categorizeDPI(dpi: number): "منخفضة" | "متوسطة" | "عالية" | "جاهزة للطباعة" {
  if (dpi >= 300) return "جاهزة للطباعة";
  if (dpi >= 200) return "عالية";
  if (dpi >= 100) return "متوسطة";
  return "منخفضة";
}

/// حساب نسبة العرض للارتفاع كنص
function getAspectRatioText(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const r = gcd(w, h);
  return `${w / r}:${h / r}`;
}

/// تنسيق حجم الملف
function formatFileSize(kb: number, mb: number): string {
  if (mb >= 1) return `${mb.toFixed(2)} ميجابايت`;
  if (kb >= 1) return `${kb} كيلوبايت`;
  return `${Math.round(kb * 1024)} بايت`;
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
  let pageDimensionsMM: { width: number; height: number } | undefined;
  let closestPaperSize: string | undefined;
  let estimatedDPI: number | undefined;
  let dpiCategory: "منخفضة" | "متوسطة" | "عالية" | "جاهزة للطباعة" | undefined;
  let hasImages = false;
  let hasText = false;
  let colorSpace: "RGB" | "CMYK" | "تدرج رمادي" | "غير محدد" = "غير محدد";
  let orientation: "عمودي" | "أفقي" | "مربع" = "عمودي";
  let aspectRatio: string | undefined;
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
    let totalTextItems = 0; // عدّاد لجميع عناصر النص (حتى الفارغة)
    for (let i = 1; i <= pagesToRead; i++) {
      try {
        const page = await pdf.getPage(i);

        // ═══ الطريقة الأولى: getTextContent عادي مع normalizeWhitespace ═══
        let content = await page.getTextContent({ normalizeWhitespace: true });
        let pageTextParts: string[] = [];

        for (const item of content.items) {
          if ("str" in item) {
            totalTextItems++;
            if (item.str.trim()) {
              pageTextParts.push(item.str);
            }
          }
        }

        let pageText = pageTextParts.join(" ");

        // ═══ الطريقة الثانية: إذا لم نجد نصاً، جرّب disableCombineTextItems ═══
        // نُجرب هذه الطريقة كلما كان النص فارغاً، حتى لو وُجدت عناصر نصية فارغة
        if (pageText.trim().length === 0) {
          try {
            content = await page.getTextContent({
              normalizeWhitespace: true,
              disableCombineTextItems: true,
            });
            pageTextParts = [];
            for (const item of content.items) {
              if ("str" in item) {
                totalTextItems++;
                if (item.str.trim()) {
                  pageTextParts.push(item.str);
                }
              }
            }
            const altText = pageTextParts.join(" ");
            if (altText.trim().length > 0) {
              pageText = altText;
            }
          } catch {}
        }

        fullText += " " + pageText;
        if (pageText.trim().length > 0) hasText = true;

        // توليد معاينة مصغرة + استخراج أبعاد الصفحة من أول صفحة
        if (i === 1) {
          try {
            const viewport = page.getViewport({ scale: 1 }); // scale=1 للحصول على البكسلات الحقيقية
            const pdfWidthMM = (viewport.width * 25.4) / 72; // PDF يستخدم 72 نقطة/إنش
            const pdfHeightMM = (viewport.height * 25.4) / 72;
            pageDimensionsMM = {
              width: Math.round(pdfWidthMM * 10) / 10,
              height: Math.round(pdfHeightMM * 10) / 10,
            };
            closestPaperSize = findClosestPaperSize(pdfWidthMM, pdfHeightMM).name;
            orientation = pdfHeightMM > pdfWidthMM + 1 ? "عمودي" : pdfWidthMM > pdfHeightMM + 1 ? "أفقي" : "مربع";
            isPortrait = orientation === "عمودي";
            aspectRatio = getAspectRatioText(Math.round(pdfWidthMM), Math.round(pdfHeightMM));

            // المعاينة المصغرة
            const thumbViewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement("canvas");
            canvas.width = thumbViewport.width;
            canvas.height = thumbViewport.height;
            const context = canvas.getContext("2d");
            if (context) {
              await page.render({ canvasContext: context, viewport: thumbViewport, canvas } as Parameters<typeof page.render>[0]).promise;
              thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);

              // تحليل الألوان من المعاينة
              try {
                const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
                let colorPixels = 0;
                let grayPixels = 0;
                const sampleStep = 16; // عينة كل 16 بكسل
                for (let p = 0; p < imgData.data.length; p += 4 * sampleStep) {
                  const r = imgData.data[p];
                  const g = imgData.data[p + 1];
                  const b = imgData.data[p + 2];
                  const maxC = Math.max(r, g, b);
                  const minC = Math.min(r, g, b);
                  if (maxC - minC > 30) {
                    colorPixels++;
                  } else {
                    grayPixels++;
                  }
                }
                const total = colorPixels + grayPixels;
                if (total > 0) {
                  if (colorPixels / total > 0.3) {
                    colorSpace = "RGB";
                  } else {
                    colorSpace = "تدرج رمادي";
                  }
                }
              } catch {}

              // تقدير DPI من بكسلات المعاينة والأبعاد الفعلية
              estimatedDPI = Math.round(canvas.width / (pdfWidthMM / 25.4));
              dpiCategory = categorizeDPI(estimatedDPI);
            }

            // فحص وجود صور ونصوص في الصفحة (من operators)
            try {
              const ops = await page.getOperatorList();
              // أسماء عوامل النص في pdf.js
              const textOpNames = new Set([
                String(lib.OPS.showText),
                String(lib.OPS.showSpacedText),
              ]);
              const imageOpNames = new Set([
                String(lib.OPS.paintImageXObject),
                String(lib.OPS.paintJpegXObject),
              ]);

              for (let opIdx = 0; opIdx < ops.fnArray.length; opIdx++) {
                const fnName = String(ops.fnArray[opIdx]);
                if (textOpNames.has(fnName) && !hasText) {
                  // وجود عوامل طباعة نص = الملف يحتوي نصوص
                  hasText = true;
                }
                if (imageOpNames.has(fnName)) {
                  hasImages = true;
                }
                if (hasText && hasImages) break;
              }
            } catch {}
          } catch {}
        }
      } catch {}
    }

    // ═══ فحص إضافي: إذا وجدنا عناصر نص كثيرة (حتى لو فارغة) فالملف يحتوي نصوص ═══
    // هذا يحدث مع ملفات PDF التي تستخدم ترميز خطوط مخصص (CMap) لا يستطيع pdf.js فك شفرته
    if (!hasText && totalTextItems > 5) {
      hasText = true;
      insights.push("نصوص مكتشفة (ترميز خطوط مخصص — قد لا يتم عرضها بشكل صحيح)");
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
    suggestedPaperSize: closestPaperSize && closestPaperSize !== "مخصص" ? closestPaperSize : suggestedPaperSize,
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
    // الحقول التفصيلية الجديدة
    pageDimensionsMM,
    closestPaperSize,
    estimatedDPI,
    dpiCategory,
    colorSpace,
    hasImages,
    hasText,
    orientation,
    aspectRatio,
    fileSizeFormatted: formatFileSize(sizeKB, sizeMB),
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
  let imgColorSpace: "RGB" | "CMYK" | "تدرج رمادي" | "غير محدد" = "غير محدد";
  const insights: string[] = [];

  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    width = img.naturalWidth;
    height = img.naturalHeight;

    // إنشاء معاينة مصغرة + استخراج الألوان السائدة + تحليل المساحة اللونية
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

        // تحليل المساحة اللونية والألوان السائدة
        const sampleCanvas = document.createElement("canvas");
        sampleCanvas.width = 20;
        sampleCanvas.height = 20;
        const sCtx = sampleCanvas.getContext("2d");
        if (sCtx) {
          sCtx.drawImage(img, 0, 0, 20, 20);
          const data = sCtx.getImageData(0, 0, 20, 20).data;
          const colorBuckets: Record<string, number> = {};
          let colorPixels = 0;
          let grayPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = Math.round(data[i] / 64) * 64;
            const g = Math.round(data[i + 1] / 64) * 64;
            const b = Math.round(data[i + 2] / 64) * 64;
            const key = `${r},${g},${b}`;
            colorBuckets[key] = (colorBuckets[key] || 0) + 1;
            // فحص ألوان/رمادي
            const maxC = Math.max(data[i], data[i + 1], data[i + 2]);
            const minC = Math.min(data[i], data[i + 1], data[i + 2]);
            if (maxC - minC > 30) colorPixels++;
            else grayPixels++;
          }
          const sorted = Object.entries(colorBuckets).sort((a, b) => b[1] - a[1]).slice(0, 3);
          dominantColors = sorted.map(([k]) => {
            const [r, g, b] = k.split(",").map(Number);
            const brightness = (r + g + b) / 3;
            if (brightness > 240) return "فاتح";
            if (brightness < 16) return "داكن";
            return `rgb(${r},${g},${b})`;
          });
          // تصنيف المساحة اللونية
          const total = colorPixels + grayPixels;
          if (total > 0) {
            imgColorSpace = colorPixels / total > 0.3 ? "RGB" : "تدرج رمادي";
          }
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
  const orientation: "عمودي" | "أفقي" | "مربع" = isPortrait ? "عمودي" : isLandscape ? "أفقي" : "مربع";

  // تقدير DPI على ورق A4
  const a4WMM = 210;
  const a4HMM = 297;
  const imgDPI = estimateDPI(width, height, a4WMM, a4HMM);
  const imgDpiCat = categorizeDPI(imgDPI);

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

  insights.push(`الدقة على A4: ≈${imgDPI} DPI (${imgDpiCat})`);

  if (dominantColors.length > 0) {
    insights.push(`ألوان سائدة: ${dominantColors.join("، ")}`);
  }

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
    // الحقول التفصيلية الجديدة
    pageDimensionsMM: { width, height: height }, // للصور: البكسل = الأبعاد (يُفترض 72 DPI)
    estimatedDPI: imgDPI,
    dpiCategory: imgDpiCat,
    colorSpace: imgColorSpace,
    hasImages: true,
    hasText: false,
    orientation,
    aspectRatio: getAspectRatioText(width, height),
    fileSizeFormatted: formatFileSize(sizeKB, sizeMB),
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

/// نتيجة تحليل VLM
export interface VLMAnalysis {
  documentType: string;
  description: string;
  qualityAssessment: string;
  qualityReason: string;
  suggestedService: string;
  suggestedServiceName: string;
  suggestedColor: string;
  suggestedPaperSize: string;
  suggestedPaperType: string;
  suggestedBinding: string;
  confidence: number;
  insights: string[];
}

/// تحليل الملف بالذكاء الاصطناعي (VLM) — يُستدعى بعد التحليل الأساسي لتعزيزه
export async function analyzeFileWithAI(
  file: File,
  basicAnalysis: RealFileAnalysis,
): Promise<{ vlmAnalysis: VLMAnalysis | null; enhancedAnalysis: RealFileAnalysis }> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);

  try {
    const formData = new FormData();
    formData.append("fileName", file.name);
    formData.append("fileType", basicAnalysis.fileType);

    // إرسال المعاينة المصغرة أو الصورة الأصلية
    if (basicAnalysis.thumbnailUrl) {
      formData.append("thumbnailDataUrl", basicAnalysis.thumbnailUrl);
    } else if (isImage) {
      // تحويل الصورة الأصلية إلى data URL
      formData.append("file", file);
    }

    // إرسال نص مستخرج من PDF
    if (basicAnalysis.textPreview) {
      formData.append("textPreview", basicAnalysis.textPreview);
    }

    // عدد الصفحات كسياق
    if (basicAnalysis.pageCount > 0) {
      formData.append("pageCount", String(basicAnalysis.pageCount));
    }

    // لا نرسل طلب VLM إذا لم يكن هناك صورة أو معاينة
    if (!basicAnalysis.thumbnailUrl && !isImage) {
      return { vlmAnalysis: null, enhancedAnalysis: basicAnalysis };
    }

    const res = await fetch("/api/ai/analyze-file", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.warn("[VLM] API returned", res.status);
      return { vlmAnalysis: null, enhancedAnalysis: basicAnalysis };
    }

    const data = await res.json();

    if (!data.success || !data.analysis) {
      console.warn("[VLM] Analysis failed:", data.error);
      return { vlmAnalysis: null, enhancedAnalysis: basicAnalysis };
    }

    const vlm: VLMAnalysis = data.analysis;

    // دمج نتائج VLM مع التحليل الأساسي
    const enhanced: RealFileAnalysis = {
      ...basicAnalysis,
      detectedService: (vlm.suggestedService as ServiceType) || basicAnalysis.detectedService,
      detectedServiceName: vlm.suggestedServiceName || basicAnalysis.detectedServiceName,
      suggestedColor: vlm.suggestedColor || basicAnalysis.suggestedColor,
      suggestedPaperSize: vlm.suggestedPaperSize || basicAnalysis.suggestedPaperSize,
      suggestedPaperType: vlm.suggestedPaperType || basicAnalysis.suggestedPaperType,
      suggestedBinding: vlm.suggestedBinding || basicAnalysis.suggestedBinding,
      confidence: vlm.confidence || basicAnalysis.confidence,
      fileNature: vlm.documentType || basicAnalysis.fileNature,
      insights: [
        // إضافة بصمة VLM
        `🤖 تحليل ذكاء اصطناعي: ${vlm.qualityAssessment}`,
        vlm.qualityReason ? `   ${vlm.qualityReason}` : "",
        // نصائح VLM
        ...(vlm.insights || []),
        // نصائح التحليل الأساسي (التي ليست مكررة)
        ...basicAnalysis.insights.filter(
          (ins) => !vlm.insights?.some((vi: string) => ins.includes(vi) || vi.includes(ins)),
        ),
      ].filter(Boolean),
    };

    return { vlmAnalysis: vlm, enhancedAnalysis: enhanced };
  } catch (err) {
    console.warn("[VLM] Request failed:", err);
    // في حالة الفشل، نرجع التحليل الأساسي فقط
    return { vlmAnalysis: null, enhancedAnalysis: basicAnalysis };
  }
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
