// ============================================================
// نظام الميزات المدفوعة — تعريفات وأدوات مساعدة
// فقط الميزات المُنفَّذة فعلياً
// ============================================================

/// مفاتيح الميزات المدفوعة — كل مفتاح يمثل ميزة مُنفَّذة فعلياً
export type FeatureKey =
  // ===== ميزات واجهة الزبون =====
  | "directTrackingLink"     // رابط تتبع مباشر فريد لكل طلب
  | "couponCode"             // كوبون خصم عند تقديم الطلب
  | "specialOffers"          // العروض الخاصة التلقائية
  | "customLogo"             // شعار مخصص للمتجر
  | "customFooter"           // تذييل مخصص مع ساعات العمل والتواصل
  | "darkMode"               // الوضع الداكن لواجهة الزبائن
  | "invoiceBranding"        // فاتورة PDF بالشعار والألوان المخصصة
  | "whatsappLink"           // رابط واتساب مباشر في صفحة نجاح الطلب
  // ===== ميزات لوحة التاجر =====
  | "exportExcel"            // تصدير الطلبات CSV/Excel
  | "customPricing"          // أسعار مخصصة لكل خدمة
  | "serviceToggle"          // تفعيل/تعطيل الخدمات
  | "customerCrm"            // قاعدة بيانات الزبائن
  | "bulkActions"            // إجراءات جماعية على الطلبات
  | "advancedAnalytics"      // تحليلات متقدمة (رسوم بيانية)
  | "whiteLabel"             // إزالة علامة "مطبعة الذكي"
  ;

/// تعريف ميزة واحدة
export interface FeatureDef {
  key: FeatureKey;
  label: string;
  description: string;
  /// أي مستوى يظهر فيه: "customer" | "merchant"
  level: "customer" | "merchant";
  /// أيقونة من lucide (اسمها كنص)
  icon: string;
  /// ترتيب العرض
  order: number;
}

/// كل الميزات المعرّفة — مُنفَّذة فعلياً
export const FEATURE_DEFINITIONS: FeatureDef[] = [
  // ===== ميزات واجهة الزبون (8) =====
  {
    key: "directTrackingLink",
    label: "رابط تتبع مباشر",
    description: "رابط فريد لكل طلب يمكن للزبون استخدامه لتتبع طلبه بدون إدخال بيانات",
    level: "customer",
    icon: "Link2",
    order: 1,
  },
  {
    key: "couponCode",
    label: "كوبون خصم",
    description: "إمكانية إدخال كود خصم عند تقديم الطلب مع تحكم كامل بالكوبونات",
    level: "customer",
    icon: "Percent",
    order: 2,
  },
  {
    key: "specialOffers",
    label: "العروض الخاصة",
    description: "عرض عروض وخصومات تلقائية للزبائن مثل خصم الكميات وعرض اليوم",
    level: "customer",
    icon: "Sparkles",
    order: 3,
  },
  {
    key: "customLogo",
    label: "شعار مخصص",
    description: "إضافة شعار المتجر في واجهة الزبائن والفاتورة بدلاً من الأيقونة الافتراضية",
    level: "customer",
    icon: "Image",
    order: 4,
  },
  {
    key: "customFooter",
    label: "تذييل مخصص",
    description: "تذييل غني مع ساعات العمل وروابط التواصل الاجتماعي ومعلومات الاتصال",
    level: "customer",
    icon: "Layout",
    order: 5,
  },
  {
    key: "darkMode",
    label: "الوضع الداكن",
    description: "إمكانية التبديل بين الوضع الفاتح والداكن في واجهة الزبائن",
    level: "customer",
    icon: "Moon",
    order: 6,
  },
  {
    key: "invoiceBranding",
    label: "فاتورة احترافية",
    description: "فاتورة PDF بالشعار والألوان المخصصة وبيانات المتجر الكاملة",
    level: "customer",
    icon: "FileText",
    order: 7,
  },
  {
    key: "whatsappLink",
    label: "رابط واتساب",
    description: "زر واتساب مباشر في صفحة نجاح الطلب لتمكين الزبون من التواصل",
    level: "customer",
    icon: "MessageCircle",
    order: 8,
  },

  // ===== ميزات لوحة التاجر (8) =====
  {
    key: "exportExcel",
    label: "تصدير Excel",
    description: "تصدير الطلبات والزبائن إلى ملف CSV",
    level: "merchant",
    icon: "Download",
    order: 20,
  },
  {
    key: "customPricing",
    label: "أسعار مخصصة",
    description: "تعديل سعر كل خدمة ونوع ورق وتجليد حسب رغبتك",
    level: "merchant",
    icon: "DollarSign",
    order: 21,
  },
  {
    key: "serviceToggle",
    label: "تفعيل/تعطيل الخدمات",
    description: "اختيار الخدمات المتاحة للزبائن وإخفاء غير المطلوبة",
    level: "merchant",
    icon: "ToggleLeft",
    order: 22,
  },
  {
    key: "customerCrm",
    label: "قاعدة بيانات الزبائن",
    description: "عرض كل الزبائن مع إحصائيات لكل واحد وتاريخ الطلبات",
    level: "merchant",
    icon: "Users",
    order: 23,
  },
  {
    key: "bulkActions",
    label: "إجراءات جماعية",
    description: "تحديد عدة طلبات وتغيير حالتها دفعة واحدة أو حذفها",
    level: "merchant",
    icon: "ListChecks",
    order: 24,
  },
  {
    key: "advancedAnalytics",
    label: "تحليلات متقدمة",
    description: "رسوم بيانية تفصيلية وتحليل الاتجاهات وأفضل الزبائن",
    level: "merchant",
    icon: "BarChart3",
    order: 25,
  },
  {
    key: "whiteLabel",
    label: "إزالة العلامة التجارية",
    description: "إزالة علامة 'مطبعة الذكي' وجعل النظام بالكامل بعلامتك التجارية",
    level: "merchant",
    icon: "EyeOff",
    order: 26,
  },
];

/// خريطة سريعة: key → FeatureDef
const FEATURES_MAP = new Map(FEATURE_DEFINITIONS.map((f) => [f.key, f]));

/// جلب تعريف ميزة بالاسم
export function getFeatureDef(key: FeatureKey): FeatureDef | undefined {
  return FEATURES_MAP.get(key);
}

/// ميزات واجهة الزبون فقط
export const CUSTOMER_FEATURES = FEATURE_DEFINITIONS.filter((f) => f.level === "customer");

/// ميزات لوحة التاجر فقط
export const MERCHANT_FEATURES = FEATURE_DEFINITIONS.filter((f) => f.level === "merchant");

/// نوع خطة المتجر
export type ShopPlan = "free" | "paid";

/// شكل الـ features JSON
export interface ShopFeatures {
  [key: string]: boolean;
}

/// الـ features الافتراضية (كل شيء مقفل)
export const DEFAULT_FEATURES: ShopFeatures = {};
FEATURE_DEFINITIONS.forEach((f) => {
  DEFAULT_FEATURES[f.key] = false;
});

/// مجموعة المفاتيح الصالحة — لتنظيف البيانات القديمة
const VALID_KEYS = new Set(FEATURE_DEFINITIONS.map((f) => f.key));

/// تنظيف كائن الميزات من المفاتيح القديمة غير الصالحة
function cleanFeatures(raw: Record<string, unknown>): ShopFeatures {
  const clean: ShopFeatures = { ...DEFAULT_FEATURES };
  for (const [k, v] of Object.entries(raw)) {
    if (VALID_KEYS.has(k as FeatureKey)) {
      clean[k] = v === true;
    }
  }
  return clean;
}

/// تحليل ميزات المتجر من JSON string
export function parseFeatures(featuresJson: string | null | undefined, plan: string): ShopFeatures {
  // الخطة المدفوعة تعطي كل شيء مفتوح افتراضياً
  if (plan === "paid") {
    const all: ShopFeatures = {};
    FEATURE_DEFINITIONS.forEach((f) => {
      all[f.key] = true;
    });
    // إذا كان هناك تعطيل يدوي، نحترمه
    if (featuresJson) {
      try {
        const parsed = JSON.parse(featuresJson) as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) {
          if (VALID_KEYS.has(k as FeatureKey) && v === false) {
            all[k] = false;
          }
        }
      } catch {}
    }
    return all;
  }

  // الخطة المجانية — نقرأ ما هو مفعّل فقط (مع تنظيف المفاتيح القديمة)
  if (featuresJson) {
    try {
      return cleanFeatures(JSON.parse(featuresJson));
    } catch {
      return { ...DEFAULT_FEATURES };
    }
  }

  return { ...DEFAULT_FEATURES };
}

/// هل ميزة معينة مفعّلة؟
export function isFeatureEnabled(
  features: ShopFeatures | null | undefined,
  key: FeatureKey,
): boolean {
  if (!features) return false;
  return features[key] === true;
}

/// عدد الميزات المفعّلة
export function countEnabledFeatures(features: ShopFeatures | null | undefined): number {
  if (!features) return 0;
  return Object.values(features).filter(Boolean).length;
}

/// عدد الميزات الكلي
export const TOTAL_FEATURES = FEATURE_DEFINITIONS.length;