// منطق الأعمال لمطبعة الذكي — الخدمات والأسعار والخيارات

export type ServiceType =
  | "document"
  | "photo"
  | "binding"
  | "copy"
  | "card"
  | "poster";

export interface ServiceDef {
  type: ServiceType;
  name: string;
  emoji: string;
  description: string;
  popularity: number; // نسبة %
  basePricePerPage: number; // دج/صفحة
  accepts: string[]; // أنواع الملفات
  isPopular?: boolean;
}

export const SERVICES: ServiceDef[] = [
  {
    type: "document",
    name: "طباعة مستند",
    emoji: "🖨️",
    description: "PDF، وورد، تقارير، مذكرات",
    popularity: 95,
    basePricePerPage: 5,
    accepts: ["PDF", "DOCX", "JPG", "PNG", "WEBP"],
    isPopular: true,
  },
  {
    type: "photo",
    name: "طباعة صور",
    emoji: "🖼️",
    description: "صور شخصية، فنية، لوحات",
    popularity: 60,
    basePricePerPage: 25,
    accepts: ["JPG", "PNG", "WEBP", "PDF"],
  },
  {
    type: "binding",
    name: "تجليد",
    emoji: "📚",
    description: "تدبيس، لولبي، غراء",
    popularity: 40,
    basePricePerPage: 0,
    accepts: ["PDF", "DOCX"],
  },
  {
    type: "copy",
    name: "نسخ مستندات",
    emoji: "📄",
    description: "نسخ سريعة متعددة",
    popularity: 35,
    basePricePerPage: 4,
    accepts: ["PDF", "JPG", "PNG"],
  },
  {
    type: "card",
    name: "بطاقات",
    emoji: "🪪",
    description: "بطاقات عمل، دعوات، تهاني",
    popularity: 25,
    basePricePerPage: 30,
    accepts: ["PDF", "JPG", "PNG"],
  },
  {
    type: "poster",
    name: "ملصقات",
    emoji: "📜",
    description: "ملصقات كبيرة، لافتات",
    popularity: 20,
    basePricePerPage: 50,
    accepts: ["PDF", "JPG", "PNG"],
  },
];

export const SERVICE_MAP: Record<string, ServiceDef> = Object.fromEntries(
  SERVICES.map((s) => [s.type, s]),
);

// خيارات الطباعة
export interface PrintColor {
  id: string;
  label: string;
  emoji: string;
  description: string;
  multiplier: number; // يُضرب في سعر الصفحة
  surchargePerPage: number; // إضافة ثابتة لكل صفحة
}

export const COLORS: PrintColor[] = [
  {
    id: "bw",
    label: "أبيض وأسود",
    emoji: "⬛",
    description: "اقتصادي للمستندات النصية",
    multiplier: 1,
    surchargePerPage: 0,
  },
  {
    id: "color",
    label: "ملون",
    emoji: "🎨",
    description: "للعروض والصور",
    multiplier: 3,
    surchargePerPage: 0,
  },
];

export interface PaperSize {
  id: string;
  label: string;
  dimensions: string;
  note?: string;
  multiplier: number;
}

export const PAPER_SIZES: PaperSize[] = [
  { id: "A4", label: "A4", dimensions: "21×29.7 سم", note: "الأكثر استخداماً", multiplier: 1 },
  { id: "A3", label: "A3", dimensions: "29.7×42 سم", multiplier: 2 },
  { id: "A5", label: "A5", dimensions: "14.8×21 سم", multiplier: 0.6 },
];

export interface SidesOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  discount: number; // نسبة تخفيض على إجمالي الصفحات
}

export const SIDES: SidesOption[] = [
  { id: "single", label: "وجه واحد", emoji: "📄", description: "طباعة على وجه واحد فقط", discount: 0 },
  { id: "double", label: "وجهان", emoji: "📑", description: "توفير 50% من الأوراق", discount: 0.5 },
];

export interface BindingOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  price: number; // دج ثابت لكل نسخة
}

export const BINDINGS: BindingOption[] = [
  { id: "none", label: "بدون", emoji: "📄", description: "بدون تجليد", price: 0 },
  { id: "staple", label: "تدبيس", emoji: "📌", description: "سريع وبسيط", price: 20 },
  { id: "spiral", label: "لولبي", emoji: "🌀", description: "يُفتح 360°", price: 150 },
  { id: "glue", label: "غراء", emoji: "📚", description: "احترافي وفاخر", price: 200 },
];

export interface PaperType {
  id: string;
  label: string;
  emoji: string;
  description: string;
  surchargePerPage: number; // دج/صفحة
}

export const PAPER_TYPES: PaperType[] = [
  { id: "normal", label: "عادي", emoji: "📄", description: "80 غرام — الأكثر طلباً", surchargePerPage: 0 },
  { id: "glossy", label: "لامع", emoji: "✨", description: "لمعان عالي للألوان", surchargePerPage: 10 },
  { id: "matte", label: "مطفي", emoji: "🔲", description: "مظهر راقي غير عاكس", surchargePerPage: 8 },
  { id: "cardboard", label: "مقوّى", emoji: "💳", description: "ورق سميك متين", surchargePerPage: 15 },
];

export interface DeliveryOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  badge?: string;
  surcharge: number; // دج
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: "hour", label: "خلال ساعة", emoji: "⚡", description: "للطلبات العاجلة", badge: "عاجل ⚡", surcharge: 100 },
  { id: "today", label: "اليوم", emoji: "📅", description: "خلال ساعات العمل", surcharge: 0 },
  { id: "tomorrow", label: "غداً", emoji: "📆", description: "اليوم التالي", surcharge: 0 },
  { id: "scheduled", label: "تاريخ محدد", emoji: "🗓️", description: "اختر التاريخ", surcharge: 0 },
];

export interface PricingInput {
  serviceType: ServiceType;
  pages: number; // عدد الصفحات الفعلي المطلوب طباعته (بعد تطبيق النطاق)
  copies: number;
  color: string;
  paperSize: string;
  sides: string;
  binding: string;
  paperType: string;
  delivery: string;
}

export interface PricingBreakdown {
  perPage: number;
  pagesCost: number;
  copiesCost: number;
  sidesSaving: number;
  paperTypeSurcharge: number;
  bindingCost: number;
  deliveryCost: number;
  discount: number;
  total: number;
}

// ===== خيار نطاق الطباعة =====
export interface PrintRangeOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const PRINT_RANGES: PrintRangeOption[] = [
  { id: "all", label: "الملف كامل", emoji: "📄", description: "طباعة جميع صفحات الملف" },
  { id: "custom", label: "صفحات معينة", emoji: "🔢", description: "اختر صفحات محددة للطباعة" },
];

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const service = SERVICE_MAP[input.serviceType];
  const color = COLORS.find((c) => c.id === input.color) || COLORS[0];
  const paperSize = PAPER_SIZES.find((p) => p.id === input.paperSize) || PAPER_SIZES[0];
  const sides = SIDES.find((s) => s.id === input.sides) || SIDES[0];
  const binding = BINDINGS.find((b) => b.id === input.binding) || BINDINGS[0];
  const paperType = PAPER_TYPES.find((p) => p.id === input.paperType) || PAPER_TYPES[0];
  const delivery = DELIVERY_OPTIONS.find((d) => d.id === input.delivery) || DELIVERY_OPTIONS[1];

  const basePerPage = service.basePricePerPage;
  const perPage = Math.round(
    (basePerPage * color.multiplier * paperSize.multiplier) + color.surchargePerPage + paperType.surchargePerPage,
  );
  const pagesCost = perPage * input.pages;
  let copiesCost = pagesCost * input.copies;
  const sidesSaving = Math.round(copiesCost * sides.discount);
  copiesCost -= sidesSaving;
  const paperTypeSurcharge = paperType.surchargePerPage * input.pages * input.copies;
  const bindingCost = binding.price * input.copies;
  const deliveryCost = delivery.surcharge;

  // خصم الكميات: 10% للنسخ من 10 فأكثر، 15% من 50
  let discount = 0;
  if (input.copies >= 50) discount = Math.round(copiesCost * 0.15);
  else if (input.copies >= 10) discount = Math.round(copiesCost * 0.1);

  const total = Math.max(
    10,
    copiesCost + bindingCost + deliveryCost - discount,
  );

  return {
    perPage,
    pagesCost,
    copiesCost,
    sidesSaving,
    paperTypeSurcharge,
    bindingCost,
    deliveryCost,
    discount,
    total,
  };
}

export const STATUS_META: Record<
  string,
  { label: string; emoji: string; color: string; bg: string; step: number }
> = {
  pending: { label: "بانتظار الطباعة", emoji: "⏳", color: "text-amber-700", bg: "bg-amber-50 text-amber-700 border-amber-200", step: 1 },
  printing: { label: "جارٍ التنفيذ", emoji: "🖨️", color: "text-blue-700", bg: "bg-blue-50 text-blue-700 border-blue-200", step: 2 },
  ready: { label: "جاهز للاستلام", emoji: "✅", color: "text-emerald-700", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", step: 3 },
  delivered: { label: "تم التسليم", emoji: "📦", color: "text-emerald-800", bg: "bg-emerald-100 text-emerald-800 border-emerald-300", step: 4 },
  cancelled: { label: "ملغي", emoji: "❌", color: "text-rose-700", bg: "bg-rose-50 text-rose-700 border-rose-200", step: 0 },
};

export const STATUS_FLOW = ["pending", "printing", "ready", "delivered"];

export function generateReference(): string {
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `A-${rnd}`;
}

// ===== التحليل الذكي التلقائي للملف =====
export interface SmartAnalysis {
  detectedService: ServiceType;
  detectedServiceName: string;
  pageCount: number;
  suggestedColor: string;
  suggestedPaperSize: string;
  suggestedPaperType: string;
  suggestedBinding: string;
  confidence: number; // 0-100
  insights: string[];
}

/// تحليل ذكي للملف يحاكي اكتشاف النوع والصفحات والإعدادات المثلى
export function analyzeFileSmartly(fileName: string, fileType: string, fileSize?: number): SmartAnalysis {
  const ext = fileType.toLowerCase();
  const name = fileName.toLowerCase();
  const size = fileSize || 0;

  // اكتشاف نوع الخدمة من الامتداد والاسم
  let detectedService: ServiceType = "document";
  let confidence = 75;
  const insights: string[] = [];

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    detectedService = "photo";
    confidence = 92;
    insights.push("صورة مكتشفة — يُنصح بورق لامع وطباعة ملونة");
  } else if (ext === "pdf") {
    // الكشف من اسم الملف
    if (/cv|resume|سيرة|ذاتية/.test(name)) {
      detectedService = "document";
      confidence = 88;
      insights.push("سيرة ذاتية مكتشفة — يُنصح بورق مقوّى وطباعة عالية الجودة");
    } else if (/report|تقرير|memo|مذكرة|search|بحث/.test(name)) {
      detectedService = "document";
      confidence = 85;
      insights.push("مستند نصي — أبيض وأسود اقتصادي مع تجليد لولبي");
    } else if (/card|بطاقة|invite|دعوة/.test(name)) {
      detectedService = "card";
      confidence = 90;
      insights.push("بطاقة مكتشفة — ورق مقوّى وطباعة ملونة");
    } else if (/poster|ملصق|affiche/.test(name)) {
      detectedService = "poster";
      confidence = 89;
      insights.push("ملصق مكتشف — حجم A3 وطباعة ملونة");
    } else {
      detectedService = "document";
      confidence = 80;
      insights.push("ملف PDF — تم ضبط الإعدادات الافتراضية المناسبة");
    }
  } else if (["doc", "docx"].includes(ext)) {
    detectedService = "document";
    confidence = 86;
    insights.push("مستند وورد — أبيض وأسود اقتصادي");
  }

  // تقدير عدد الصفحات من حجم الملف (محاكاة ذكية)
  let pageCount = 10;
  if (size > 0) {
    if (ext === "pdf") {
      pageCount = Math.max(1, Math.min(500, Math.round(size / 50000))); // ~50KB/صفحة
    } else if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      pageCount = 1;
    } else {
      pageCount = Math.max(1, Math.min(200, Math.round(size / 30000)));
    }
  }
  insights.push(`عدد الصفحات المقدّر: ${pageCount} صفحة`);

  // اقتراحات الإعدادات حسب الخدمة
  const service = SERVICE_MAP[detectedService];
  let suggestedColor = "bw";
  let suggestedPaperSize = "A4";
  let suggestedPaperType = "normal";
  let suggestedBinding = "none";

  if (detectedService === "photo") {
    suggestedColor = "color";
    suggestedPaperType = "glossy";
    insights.push("توصية: ورق لامع + طباعة ملونة لأفضل جودة للصور");
  } else if (detectedService === "card") {
    suggestedColor = "color";
    suggestedPaperType = "cardboard";
    insights.push("توصية: ورق مقوّى + طباعة ملونة لمظهر احترافي");
  } else if (detectedService === "poster") {
    suggestedColor = "color";
    suggestedPaperSize = "A3";
    suggestedPaperType = "glossy";
    insights.push("توصية: حجم A3 + ورق لامع لملصق بارز");
  } else if (detectedService === "document") {
    if (pageCount > 20) {
      suggestedBinding = "spiral";
      insights.push("توصية: تجليد لولبي لمستند طويل");
    }
  }

  return {
    detectedService,
    detectedServiceName: service.name,
    pageCount,
    suggestedColor,
    suggestedPaperSize,
    suggestedPaperType,
    suggestedBinding,
    confidence,
    insights,
  };
}

/// حساب الوقت المتوقع للتسليم بالساعات
export function estimateDeliveryHours(deliveryMode: string, pages: number, copies: number): number {
  const totalPages = pages * copies;
  let baseHours = 1; // أساس
  baseHours += Math.ceil(totalPages / 50); // ساعة لكل 50 صفحة
  if (deliveryMode === "hour") return Math.max(1, baseHours);
  if (deliveryMode === "today") return Math.max(2, baseHours + 1);
  if (deliveryMode === "tomorrow") return 24;
  return 48; // scheduled
}


export function formatDA(n: number): string {
  return `${n.toLocaleString("en-US")} دج`;
}

export function formatDateAr(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar-DZ-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatDateTimeAr(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-DZ-u-nu-latn", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
