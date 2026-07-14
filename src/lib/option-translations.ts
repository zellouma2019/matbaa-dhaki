// ترجمة مفاتيح وقيم خيارات الطباعة من الإنجليزية إلى العربية

// ترجمة المفاتيح
export const OPTION_KEY_LABELS: Record<string, string> = {
  pages: "عدد الصفحات",
  copies: "عدد النسخ",
  color: "نوع الطباعة",
  paperSize: "حجم الورق",
  sides: "الوجهين",
  binding: "التجليد",
  paperType: "نوع الورق",
  photoSize: "حجم الصورة",
  finish: "التشطيب",
  retouch: "تحسينات",
  bindingType: "نوع التجليد",
  coverColor: "لون الغلاف",
  coverPrint: "طباعة الغلاف",
  cardType: "نوع البطاقة",
  lamination: "التغليف",
  posterSize: "حجم الملصق",
  material: "الخامة",
  sorting: "الترتيب",
  extras: "إضافات",
  appliedOffer: "العرض المطبّق",
  printRange: "نطاق الطباعة",
  pageRange: "الصفحات المحددة",
  totalPages: "إجمالي الصفحات",
  notes: "ملاحظات",
  // مفاتيح نظام المواصفات الجديد
  printMethod: "طريقة الطباعة",
  colorProcessing: "معالجة الألوان",
  bleedCut: "القص والحواف",
  dpiBoost: "جودة الدقة",
  imageFit: "ملائمة الصورة",
  pageNumbering: "ترقيم الصفحات",
};

// ترجمة القيم
export const OPTION_VALUE_LABELS: Record<string, string> = {
  // الألوان
  bw: "أبيض وأسود",
  color: "ملون",
  // الوجهين
  single: "وجه واحد",
  double: "وجهان",
  // التجليد
  none: "بدون",
  staple: "تدبيس",
  spiral: "لولبي",
  "spiral-metal": "لولبي معدني",
  glue: "غراء حراري",
  thermal: "حراري بغلاف",
  hardcover: "غلاف مقوّى فاخر",
  // نوع الورق
  normal: "عادي",
  glossy: "لامع",
  matte: "مطفي",
  cardboard: "مقوّى",
  "cardboard-250": "مقوّى 250 غرام",
  "cardboard-300": "مقوّى 300 غرام",
  "cardboard-350": "مقوّى 350 غرام",
  pvc: "بلاستيك PVC",
  recycled: "مُعاد تدويره",
  premium: "فاخر برو",
  metallic: "معدني",
  // التشطيب (الصور)
  borderless: "بلا إطار",
  border: "مع إطار أبيض",
  whiteframe: "إطار عريض",
  // التحسينات
  auto: "تعديل تلقائي",
  removebg: "إزالة الخلفية",
  restore: "ترميم الصور",
  // ألوان الغلاف
  transparent: "شفاف",
  black: "أسود",
  blue: "أزرق",
  red: "أحمر",
  leather: "جلد صناعي",
  // طباعة الغلاف
  "bw-title": "عنوان أبيض وأسود",
  "color-title": "عنوان ملون",
  "full-design": "تصميم كامل",
  // أنواع البطاقات
  business: "بطاقة عمل",
  id: "بطاقة هوية",
  invitation: "دعوة",
  greeting: "بطاقة تهنئة",
  loyalty: "بطاقة ولاء",
  // التغليف (لمنيشن)
  "glossy-lam": "تغليف لامع",
  "matte-lam": "تغليف مطفي",
  "soft-touch": "لمسة ناعمة",
  "spot-uv": "UV بارز",
  "uv-resist": "مقاوم UV",
  // الخامات
  "glossy-paper": "ورق لامع",
  "matte-paper": "ورق مطفي",
  "photo-paper": "ورق فوتوغرافي",
  vinyl: "فينيل (PVC)",
  canvas: "قماش كانفاس",
  fabric: "قماش",
  // التشطيب (البطاقات)
  standard: "حروف قياسية",
  foil: "ختم ذهبي/فضي",
  emboss: "نقش بارز",
  rounded: "حواف مدورة",
  // الترتيب
  collated: "مرتبة",
  uncollated: "غير مرتبة",
  // إضافات
  tabs: "فواصم ملونة",
  ribbon: "إشارة مرجعية",
  // التشطيب (الملصقات)
  plain: "عادي",
  grommets: "حلقات معدنية",
  rod: "مع عصا",
  frame: "بإطار",
  // التسليم
  hour: "خلال ساعة",
  today: "اليوم",
  tomorrow: "غداً",
  scheduled: "تاريخ محدد",
  // طريقة الاستلام
  pickup: "استلام من المطبعة",
  delivery: "توصيل للعنوان",
  // طريقة الطباعة (نظام المواصفات الجديد)
  offset: "أوفست",
  "large-format": "طباعة كبيرة",
  digital: "رقمية",
  // معالجة الألوان
  "as-is": "كما هو",
  "force-bw": "تحويل أبيض/أسود",
  enhance: "تعزيز الألوان",
  "color-correct": "تصحيح ألوان احترافي",
  // القص والحواف
  "auto-cut": "قص تلقائي",
  "margin-5": "مع هامش 5 مم",
  bleed: "بدون حواف",
  "safe-margin": "حواف آمنة 10 مم",
  // جودة الدقة
  "dpi-150": "150 DPI",
  "dpi-300": "300 DPI",
  // ملائمة الصورة
  "keep-ratio": "حفظ النسبة",
  fill: "ملء الصفحة",
  "white-bg": "مع خلفية بيضاء",
  "crop-fill": "اقتصاص وملء",
  // ترقيم الصفحات
  "page-numbers": "ترقيم تلقائي",
  "no-numbers": "بدون ترقيم",
};

/**
 * ترجمة مفتاح خيار إلى العربية
 */
export function translateOptionKey(key: string): string {
  return OPTION_KEY_LABELS[key] || key;
}

/**
 * ترجمة قيمة خيار إلى العربية
 */
export function translateOptionValue(value: string): string {
  return OPTION_VALUE_LABELS[value] || value;
}

/**
 * ترجمة المفتاح والقيمة معاً
 */
export function translateOption(key: string, value: string): { label: string; value: string } {
  return {
    label: translateOptionKey(key),
    value: translateOptionValue(value),
  };
}

/**
 * قائمة المفاتيح التي يجب إخفاؤها (ليست خيارات طباعة)
 */
export const HIDDEN_OPTION_KEYS = [
  "notes",
  "printRange",
  "pageRange",
  "totalPages",
  "appliedOffer",
];
