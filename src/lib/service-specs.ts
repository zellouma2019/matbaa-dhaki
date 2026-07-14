// المواصفات المخصصة لكل نوع خدمة - كل خدمة لها خيارات طباعة وتجليد مختلفة

export type ServiceType =
  | "document"
  | "photo"
  | "binding"
  | "copy"
  | "card"
  | "poster";

// ===== أنواع الخيارات =====
export interface SpecOption {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
  price?: number; // سعر إضافي ثابت
  pricePerPage?: number; // سعر إضافي لكل صفحة
  multiplier?: number; // مضاعف سعر الصفحة
  note?: string;
}

export interface ServiceSpec {
  type: ServiceType;
  name: string;
  emoji: string;
  description: string;
  popularity: number;
  basePricePerPage: number;
  accepts: string[];
  isPopular?: boolean;
  // الأقسام المعروضة في الإعدادات
  sections: SpecSection[];
  /** هل الخدمة تعتمد على عدد الصفحات؟ (الصور لا) */
  hasPageCount?: boolean;
  /** هل تسمح بنطاق طباعة (كامل/صفحات معينة)؟ */
  hasPrintRange?: boolean;
  /** الوحدة المستخدمة (صفحة، صورة، بطاقة، نسخة) */
  unit?: string;
}

export interface SpecSection {
  id: string;
  title: string;
  hint?: string;
  options: SpecOption[];
  /** المعرّف المستخدم في options JSON */
  optionKey: string;
  /** اختيار واحد أو متعدد */
  multiple?: boolean;
  /** إظهار فقط (مثلاً معلومات) */
  info?: boolean;
}

// ============================================================
// طباعة المستندات - PDF، وورد، تقارير، مذكرات
// ============================================================
export const DOCUMENT_SPEC: ServiceSpec = {
  type: "document",
  name: "طباعة مستند",
  emoji: "🖨️",
  description: "PDF، وورد، تقارير، مذكرات",
  popularity: 95,
  basePricePerPage: 5,
  accepts: ["PDF", "DOCX", "JPG", "PNG", "WEBP"],
  hasPageCount: true,
  hasPrintRange: true,
  unit: "صفحة",
  isPopular: true,
  sections: [
    {
      id: "color",
      title: "نوع الطباعة",
      hint: "اختر اللون المناسب لطباعتك",
      optionKey: "color",
      options: [
        { id: "bw", label: "أبيض وأسود", emoji: "⬛", description: "اقتصادي للمستندات النصية", multiplier: 1 },
        { id: "color", label: "ملون", emoji: "🎨", description: "للعروض والرسوم", multiplier: 3 },
      ],
    },
    {
      id: "paperSize",
      title: "حجم الورق",
      hint: "A4 هو الأكثر شيوعاً",
      optionKey: "paperSize",
      options: [
        { id: "A4", label: "A4", description: "21×29.7 سم", note: "الأكثر استخداماً", multiplier: 1 },
        { id: "A3", label: "A3", description: "29.7×42 سم", multiplier: 2 },
        { id: "A5", label: "A5", description: "14.8×21 سم", multiplier: 0.6 },
      ],
    },
    {
      id: "sides",
      title: "طباعة الوجهين",
      hint: "الوجهان يوفر الورق",
      optionKey: "sides",
      options: [
        { id: "single", label: "وجه واحد", emoji: "📄", description: "طباعة على وجه واحد فقط" },
        { id: "double", label: "وجهان", emoji: "📑", description: "توفير 50% من الأوراق", note: "تخفيض 50%" },
      ],
    },
    {
      id: "paperType",
      title: "نوع الورق",
      hint: "للأوراق العادية والأبحاث",
      optionKey: "paperType",
      options: [
        { id: "normal", label: "عادي", emoji: "📄", description: "80 غرام — الأكثر طلباً", pricePerPage: 0 },
        { id: "glossy", label: "لامع", emoji: "✨", description: "لمعان عالي", pricePerPage: 10 },
        { id: "matte", label: "مطفي", emoji: "🔲", description: "مظهر راقي", pricePerPage: 8 },
        { id: "cardboard", label: "مقوّى", emoji: "💳", description: "ورق سميك 200 غرام", pricePerPage: 15 },
      ],
    },
    {
      id: "binding",
      title: "التجليد",
      hint: "اختر طريقة تجليد الملف",
      optionKey: "binding",
      options: [
        { id: "none", label: "بدون", emoji: "📄", description: "بدون تجليد", price: 0 },
        { id: "staple", label: "تدبيس", emoji: "📌", description: "سريع وبسيط", price: 20 },
        { id: "spiral", label: "لولبي", emoji: "🌀", description: "يُفتح 360°", price: 150 },
        { id: "glue", label: "غراء", emoji: "📚", description: "احترافي وفاخر", price: 200 },
      ],
    },
  ],
};

// ============================================================
// طباعة الصور - تختلف تماماً عن المستندات
// ============================================================
export const PHOTO_SPEC: ServiceSpec = {
  type: "photo",
  name: "طباعة صور",
  emoji: "🖼️",
  description: "صور شخصية، فنية، لوحات",
  popularity: 60,
  basePricePerPage: 25,
  accepts: ["JPG", "PNG", "WEBP", "PDF"],
  hasPageCount: false, // الصور لا تحتوي على صفحات
  hasPrintRange: false,
  unit: "صورة",
  sections: [
    {
      id: "photoSize",
      title: "حجم الصورة",
      hint: "مقاسات الصور القياسية",
      optionKey: "photoSize",
      options: [
        { id: "10x15", label: "10×15 سم", emoji: "📸", description: "صورة جيب", multiplier: 0.4, note: "الأكثر طلباً" },
        { id: "13x18", label: "13×18 سم", emoji: "🖼️", description: "صورة متوسطة", multiplier: 0.6 },
        { id: "15x21", label: "15×21 سم", emoji: "🖼️", description: "صورة كبيرة", multiplier: 0.8 },
        { id: "20x30", label: "20×30 سم", emoji: "🖼️", description: "بوستر صغير", multiplier: 1.2 },
        { id: "A4", label: "A4", emoji: "📄", description: "21×29.7 سم", multiplier: 1 },
      ],
    },
    {
      id: "paperType",
      title: "نوع ورق الصور",
      hint: "أنواع خاصة بالصور",
      optionKey: "paperType",
      options: [
        { id: "glossy", label: "لامع فوتوغرافي", emoji: "✨", description: "لمعان عالي — للألوان الزاهية", pricePerPage: 0, note: "الأفضل للصور" },
        { id: "matte", label: "مطفي فوتوغرافي", emoji: "🔲", description: "غير عاكس — أناقة ورقيّة", pricePerPage: 5 },
        { id: "premium", label: "فاخر برو", emoji: "💎", description: "حريري عالي الجودة", pricePerPage: 15 },
        { id: "metallic", label: "معدني", emoji: "🥇", description: "لمعة معدنية خاصة", pricePerPage: 25 },
      ],
    },
    {
      id: "finish",
      title: "التشطيب",
      hint: "خيارات خاصة بالصور",
      optionKey: "finish",
      options: [
        { id: "borderless", label: "بلا إطار", emoji: "⬜", description: "حتى الحواف", price: 0 },
        { id: "border", label: "مع إطار أبيض", emoji: "▭", description: "هامش أبيض حول الصورة", price: 0 },
        { id: "whiteframe", label: "إطار عريض", emoji: "🖼️", description: "إطار أبيض عريض", price: 30 },
      ],
    },
    {
      id: "retouch",
      title: "تحسينات اختيارية",
      hint: "تحسين جودة الصورة",
      optionKey: "retouch",
      options: [
        { id: "none", label: "بدون تعديل", emoji: "✅", description: "طباعة كما هي", price: 0 },
        { id: "auto", label: "تعديل تلقائي", emoji: "🎨", description: "سطوع وتباين وحدة لون", price: 20 },
        { id: "removebg", label: "إزالة الخلفية", emoji: "✂️", description: "خلفية بيضاء/شفافة", price: 50 },
        { id: "restore", label: "ترميم الصور", emoji: "🔧", description: "للصور القديمة والتالفة", price: 100 },
      ],
    },
  ],
};

// ============================================================
// تجليد الكتب والبحوث - الخدمة الأساسية هي التجليد نفسه
// ============================================================
export const BINDING_SPEC: ServiceSpec = {
  type: "binding",
  name: "تجليد",
  emoji: "📚",
  description: "تدبيس، لولبي، غراء، حراري",
  popularity: 40,
  basePricePerPage: 0,
  accepts: ["PDF", "DOCX"],
  hasPageCount: true,
  hasPrintRange: false,
  unit: "نسخة",
  sections: [
    {
      id: "bindingType",
      title: "نوع التجليد",
      hint: "الأساسية لهذه الخدمة",
      optionKey: "bindingType",
      options: [
        { id: "staple", label: "تدبيس", emoji: "📌", description: "سريع وبسيط — للأوراق القليلة", price: 20 },
        { id: "spiral", label: "لولبي بلاستيكي", emoji: "🌀", description: "يُفتح 360° — مرونة كاملة", price: 150, note: "الأكثر طلباً" },
        { id: "spiral-metal", label: "لولبي معدني", emoji: "⛓️", description: "متين وفاخر — للكتب الثقيلة", price: 250 },
        { id: "glue", label: "غراء حراري", emoji: "📚", description: "احترافي — للكتب والروايات", price: 200 },
        { id: "thermal", label: "حراري بغلاف", emoji: "📕", description: "غلاف أمامي خلفي — مظهر كتاب", price: 350 },
        { id: "hardcover", label: "غلاف مقوّى فاخر", emoji: "📖", description: "تجليد فاخر بكتاب كامل", price: 800 },
      ],
    },
    {
      id: "coverColor",
      title: "لون الغلاف",
      hint: "للأغلفة الأمامية والخلفية",
      optionKey: "coverColor",
      options: [
        { id: "transparent", label: "شفاف", emoji: "⬜", description: "غلاف بلاستيكي شفاف", price: 0 },
        { id: "black", label: "أسود", emoji: "⬛", description: "غلاف أسود كلاسيكي", price: 0 },
        { id: "blue", label: "أزرق", emoji: "🟦", description: "غلاف أزرق", price: 0 },
        { id: "red", label: "أحمر", emoji: "🟥", description: "غلاف أحمر", price: 0 },
        { id: "leather", label: "جلد صناعي", emoji: "🟫", description: "مظهر جلدي فاخر", price: 100 },
      ],
    },
    {
      id: "coverPrint",
      title: "طباعة الغلاف",
      hint: "إضافة عنوان للغلاف",
      optionKey: "coverPrint",
      options: [
        { id: "none", label: "بدون طباعة", emoji: "📄", description: "غلاف فارغ", price: 0 },
        { id: "bw-title", label: "عنوان أبيض وأسود", emoji: "🏷️", description: "طباعة عنوان بسيط", price: 50 },
        { id: "color-title", label: "عنوان ملون", emoji: "🎨", description: "طباعة عنوان ملون", price: 100 },
        { id: "full-design", label: "تصميم كامل", emoji: "💎", description: "تصميم غلاف احترافي كامل", price: 250 },
      ],
    },
    {
      id: "extras",
      title: "إضافات",
      hint: "لمسات احترافية",
      optionKey: "extras",
      options: [
        { id: "tabs", label: "فواصم ملونة", emoji: "🔖", description: "فواصل بين الفصول", price: 80 },
        { id: "lamination", label: "تغليف حراري", emoji: "♻️", description: "حماية الغلاف", price: 60 },
        { id: "ribbon", label: "إشارة مرجعية", emoji: "🎀", description: "شريط علامة للصفحات", price: 40 },
      ],
    },
  ],
};

// ============================================================
// نسخ المستندات
// ============================================================
export const COPY_SPEC: ServiceSpec = {
  type: "copy",
  name: "نسخ مستندات",
  emoji: "📄",
  description: "نسخ سريعة متعددة",
  popularity: 35,
  basePricePerPage: 4,
  accepts: ["PDF", "JPG", "PNG"],
  hasPageCount: true,
  hasPrintRange: true,
  unit: "صفحة",
  sections: [
    {
      id: "color",
      title: "نوع النسخ",
      hint: "نسخ ملون أو أبيض وأسود",
      optionKey: "color",
      options: [
        { id: "bw", label: "أبيض وأسود", emoji: "⬛", description: "اقتصادي — للنصوص", multiplier: 1 },
        { id: "color", label: "ملون", emoji: "🎨", description: "نسخة طبق الأصل", multiplier: 2.5 },
      ],
    },
    {
      id: "paperSize",
      title: "حجم الورق",
      hint: "",
      optionKey: "paperSize",
      options: [
        { id: "A4", label: "A4", description: "21×29.7 سم", multiplier: 1, note: "الأكثر طلباً" },
        { id: "A3", label: "A3", description: "29.7×42 سم", multiplier: 2 },
        { id: "Legal", label: "Legal", description: "21×35.6 سم", multiplier: 1.3 },
      ],
    },
    {
      id: "sides",
      title: "الوجهين",
      hint: "",
      optionKey: "sides",
      options: [
        { id: "single", label: "وجه واحد", emoji: "📄", description: "طباعة وجه واحد" },
        { id: "double", label: "وجهان", emoji: "📑", description: "توفير 50%", note: "تخفيض 50%" },
      ],
    },
    {
      id: "paperType",
      title: "نوع الورق",
      hint: "",
      optionKey: "paperType",
      options: [
        { id: "normal", label: "عادي", emoji: "📄", description: "80 غرام", pricePerPage: 0 },
        { id: "recycled", label: "مُعاد تدويره", emoji: "♻️", description: "صديق للبيئة", pricePerPage: -1, note: "خصم" },
      ],
    },
    {
      id: "sorting",
      title: "ترتيب النسخ",
      hint: "كيف ترتيب الصفحات",
      optionKey: "sorting",
      options: [
        { id: "collated", label: "مرتبة", emoji: "📑", description: "نسخة كاملة ثم الأخرى", price: 0 },
        { id: "uncollated", label: "غير مرتبة", emoji: "📄", description: "كل الصفحات معاً", price: 0 },
      ],
    },
  ],
};

// ============================================================
// البطاقات - بطاقات عمل، دعوات، هوية
// ============================================================
export const CARD_SPEC: ServiceSpec = {
  type: "card",
  name: "بطاقات",
  emoji: "🪪",
  description: "بطاقات عمل، دعوات، هوية",
  popularity: 25,
  basePricePerPage: 30,
  accepts: ["PDF", "JPG", "PNG"],
  hasPageCount: false, // البطاقات تُحسب بالقطعة
  hasPrintRange: false,
  unit: "بطاقة",
  sections: [
    {
      id: "cardType",
      title: "نوع البطاقة",
      hint: "حسب الاستخدام",
      optionKey: "cardType",
      options: [
        { id: "business", label: "بطاقة عمل", emoji: "💼", description: "9×5.5 سم", multiplier: 1, note: "الأكثر طلباً" },
        { id: "id", label: "بطاقة هوية", emoji: "🪪", description: "8.5×5.4 سم", multiplier: 1 },
        { id: "invitation", label: "دعوة", emoji: "💌", description: "A6 (10.5×14.8 سم)", multiplier: 1.5 },
        { id: "greeting", label: "بطاقة تهنئة", emoji: "🎉", description: "A5 مطوية", multiplier: 2 },
        { id: "loyalty", label: "بطاقة ولاء", emoji: "⭐", description: "بطاقة بلاستيكية", multiplier: 1.5 },
      ],
    },
    {
      id: "paperType",
      title: "نوع الورق",
      hint: "أوراق سميكة للبطاقات",
      optionKey: "paperType",
      options: [
        { id: "cardboard-250", label: "مقوّى 250 غرام", emoji: "💳", description: "وزن قياسي للبطاقات", pricePerPage: 0, note: "القياسي" },
        { id: "cardboard-300", label: "مقوّى 300 غرام", emoji: "💳", description: "أثقل وأفخم", pricePerPage: 10 },
        { id: "cardboard-350", label: "مقوّى 350 غرام", emoji: "💳", description: "وزن فاخر", pricePerPage: 20 },
        { id: "pvc", label: "بلاستيك PVC", emoji: "🪪", description: "بطاقة بلاستيكية متينة", pricePerPage: 50 },
      ],
    },
    {
      id: "lamination",
      title: "التغليف (لمنيشن)",
      hint: "حماية ولمعان إضافي",
      optionKey: "lamination",
      options: [
        { id: "none", label: "بدون", emoji: "📄", description: "بدون تغليف", price: 0 },
        { id: "glossy-lam", label: "تغليف لامع", emoji: "✨", description: "لمعان وحماية", price: 15 },
        { id: "matte-lam", label: "تغليف مطفي", emoji: "🔲", description: "مظهر راقي غير عاكس", price: 15 },
        { id: "soft-touch", label: "لمسة ناعمة", emoji: "🤚", description: "ملمس حريري فاخر", price: 30 },
        { id: "spot-uv", label: "UV بارز", emoji: "💎", description: "لمعان بارز على عناصر محددة", price: 50 },
      ],
    },
    {
      id: "finish",
      title: "التشطيب",
      hint: "لمسات نهائية",
      optionKey: "finish",
      options: [
        { id: "standard", label: "حروف قياسية", emoji: "✏️", description: "بدون تشطيب خاص", price: 0 },
        { id: "foil", label: "ختم ذهبي/فضي", emoji: "🥇", description: "حروف بريق معدني", price: 40 },
        { id: "emboss", label: "نقش بارز", emoji: "🔝", description: "حروف بارزة لمسة", price: 60 },
        { id: "rounded", label: "حواف مدورة", emoji: "⬭", description: "زوايا دائرية", price: 10 },
      ],
    },
    {
      id: "sides",
      title: "الوجهين",
      hint: "طباعة وجه أو وجهين",
      optionKey: "sides",
      options: [
        { id: "single", label: "وجه واحد", emoji: "📄", description: "الوجه الأمامي فقط" },
        { id: "double", label: "وجهان", emoji: "📑", description: "أمامي وخلفي", multiplier: 1.5 },
      ],
    },
  ],
};

// ============================================================
// الملصقات والبوسترات
// ============================================================
export const POSTER_SPEC: ServiceSpec = {
  type: "poster",
  name: "ملصقات",
  emoji: "📜",
  description: "ملصقات كبيرة، لافتات، إعلانات",
  popularity: 20,
  basePricePerPage: 50,
  accepts: ["PDF", "JPG", "PNG"],
  hasPageCount: false, // الملصقات تُحسب بالقطعة
  hasPrintRange: false,
  unit: "ملصق",
  sections: [
    {
      id: "posterSize",
      title: "حجم الملصق",
      hint: "حسب الاستخدام",
      optionKey: "posterSize",
      options: [
        { id: "A3", label: "A3", emoji: "📜", description: "29.7×42 سم", multiplier: 1, note: "صغير" },
        { id: "A2", label: "A2", emoji: "📜", description: "42×59.4 سم", multiplier: 2 },
        { id: "A1", label: "A1", emoji: "📜", description: "59.4×84 سم", multiplier: 3.5, note: "الأكثر طلباً" },
        { id: "A0", label: "A0", emoji: "📜", description: "84×118.9 سم", multiplier: 6 },
        { id: "custom", label: "حجم مخصص", emoji: "📐", description: "حسب الطلب", multiplier: 4 },
      ],
    },
    {
      id: "material",
      title: "الخامة",
      hint: "نوع المادة المطبوع عليها",
      optionKey: "material",
      options: [
        { id: "glossy-paper", label: "ورق لامع", emoji: "✨", description: "لمعان عالي — للألوان الزاهية", pricePerPage: 0, note: "القياسي" },
        { id: "matte-paper", label: "ورق مطفي", emoji: "🔲", description: "غير عاكس — لمسحة راقية", pricePerPage: 10 },
        { id: "photo-paper", label: "ورق فوتوغرافي", emoji: "📷", description: "جودة صورة عالية", pricePerPage: 25 },
        { id: "vinyl", label: "فينيل (PVC)", emoji: "🏷️", description: "مقاوم للماء — للخارج", pricePerPage: 60 },
        { id: "canvas", label: "قماش كانفاس", emoji: "🖼️", description: "لللوحات الفنية", pricePerPage: 80 },
        { id: "fabric", label: "قماش", emoji: "🧵", description: "لللافتات القماشية", pricePerPage: 70 },
      ],
    },
    {
      id: "lamination",
      title: "التغليف الواقي",
      hint: "حماية إضافية",
      optionKey: "lamination",
      options: [
        { id: "none", label: "بدون", emoji: "📄", description: "بدون تغليف", price: 0 },
        { id: "glossy-lam", label: "تغليف لامع", emoji: "✨", description: "حماية ولمعان", price: 100 },
        { id: "matte-lam", label: "تغليف مطفي", emoji: "🔲", description: "حماية بدون لمعان", price: 100 },
        { id: "uv-resist", label: "مقاوم UV", emoji: "☀️", description: "ضد الشمس — للخارج", price: 200 },
      ],
    },
    {
      id: "finish",
      title: "التشطيب",
      hint: "تحضير للتعليق",
      optionKey: "finish",
      options: [
        { id: "plain", label: "عادي", emoji: "📄", description: "بدون تشطيب", price: 0 },
        { id: "grommets", label: "حلقات معدنية", emoji: "⭕", description: "ثقوب للحلقات — للتعليق", price: 50 },
        { id: "rod", label: "مع عصا", emoji: "🪵", description: "عصا علوية وسفلية", price: 150 },
        { id: "frame", label: "بإطار", emoji: "🖼️", description: "إطار جاهز للتعليق", price: 300 },
      ],
    },
  ],
};

export const SERVICE_SPECS: Record<ServiceType, ServiceSpec> = {
  document: DOCUMENT_SPEC,
  photo: PHOTO_SPEC,
  binding: BINDING_SPEC,
  copy: COPY_SPEC,
  card: CARD_SPEC,
  poster: POSTER_SPEC,
};

export const SPEC_LIST: ServiceSpec[] = [
  DOCUMENT_SPEC,
  PHOTO_SPEC,
  BINDING_SPEC,
  COPY_SPEC,
  CARD_SPEC,
  POSTER_SPEC,
];

// ============================================================
// حساب السعر بالمواصفات المخصصة
// ============================================================
export interface PricingResult {
  perPage: number;
  pagesCost: number;
  copiesCost: number;
  sidesSaving: number;
  extrasCost: number;
  finishingCost: number;
  deliveryCost: number;
  discount: number;
  total: number;
  breakdown: { label: string; amount: number }[];
  appliedOfferNote?: string;
}

export interface PricingRequest {
  serviceType: ServiceType;
  pages: number;
  copies: number;
  delivery: string;
  selectedOptions: Record<string, string>; // optionKey -> optionId
}

const DELIVERY_SURCHARGE: Record<string, number> = {
  hour: 100,
  today: 0,
  tomorrow: 0,
  scheduled: 0,
};

export function calculatePricingCustom(req: PricingRequest, specs?: Record<string, ServiceSpec>): PricingResult {
  const SPECS = specs || SERVICE_SPECS;
  const spec = SPECS[req.serviceType];
  const basePerPage = spec.basePricePerPage;
  const breakdown: { label: string; amount: number }[] = [];

  // حساب سعر الصفحة من كل الخيارات
  let perPageMultiplier = 1;
  let perPageAddition = 0;
  let flatExtras = 0;

  spec.sections.forEach((section) => {
    const selectedId = req.selectedOptions[section.optionKey];
    if (!selectedId) return;
    const opt = section.options.find((o) => o.id === selectedId);
    if (!opt) return;

    if (opt.multiplier) perPageMultiplier *= opt.multiplier;
    if (opt.pricePerPage) perPageAddition += opt.pricePerPage;
    if (opt.price) flatExtras += opt.price;

    if (opt.price && opt.price > 0) {
      breakdown.push({ label: `${section.title}: ${opt.label}`, amount: opt.price * req.copies });
    }
  });

  // تطبيق خصم الوجهين (50% على عدد الصفحات)
  const sidesOpt = req.selectedOptions.sides;
  let sidesSaving = 0;
  let effectivePages = req.pages;
  if (sidesOpt === "double") {
    sidesSaving = Math.floor(req.pages / 2) * 0; // الورق موفّر لكن السعر نفسه عادةً
    effectivePages = Math.ceil(req.pages / 2);
  }

  const perPage = Math.max(0, Math.round(basePerPage * perPageMultiplier + perPageAddition));
  const pagesCost = perPage * effectivePages;
  let copiesCost = pagesCost * req.copies;

  if (sidesSaving > 0) {
    copiesCost -= sidesSaving * req.copies;
  }

  breakdown.unshift({ label: `طباعة (${effectivePages} صفحة × ${req.copies} نسخة)`, amount: copiesCost });

  const finishingCost = flatExtras * req.copies;
  const deliveryCost = DELIVERY_SURCHARGE[req.delivery] || 0;
  if (deliveryCost > 0) breakdown.push({ label: "توصيل عاجل", amount: deliveryCost });

  // خصم الكمية
  let discount = 0;
  if (req.copies >= 50) discount = Math.round(copiesCost * 0.15);
  else if (req.copies >= 10) discount = Math.round(copiesCost * 0.1);
  if (discount > 0) breakdown.push({ label: "خصم الكمية", amount: -discount });

  const total = Math.max(10, copiesCost + finishingCost + deliveryCost - discount);

  return {
    perPage,
    pagesCost,
    copiesCost,
    sidesSaving,
    extrasCost: 0,
    finishingCost,
    deliveryCost,
    discount,
    total,
    breakdown,
  };
}
