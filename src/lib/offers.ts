// نظام العروض والمفاجآت الذكية - مرتبط بمواصفات الملف المرفوع

export interface Offer {
  id: string;
  type: "discount" | "free_service" | "free_product" | "loyalty" | "combo";
  title: string;
  description: string;
  emoji: string;
  badge?: string;
  // الشروط (أي ملفات تطبّق عليها)
  appliesTo: string[]; // أنواع الخدمات: document, photo, binding, copy, card, poster
  // الشروط الإضافية
  minPages?: number;
  minCopies?: number;
  // القيمة
  discountPercent?: number;
  freeService?: string; // تجليد مجاني، تغليف مجاني
  freeProduct?: string; // منتج مجاني
  // الكود الترويجي
  code: string;
  // المدة
  validityDays: number;
  // اللون الثيم
  theme: "gold" | "emerald" | "rose" | "blue" | "purple";
}

export const OFFERS: Offer[] = [
  // عروض للمستندات
  {
    id: "doc10",
    type: "discount",
    title: "خصم 10% على طلبك القادم",
    description: "عرض حصري لك! احصل على خصم 10% على طلب الطباعة القادم خلال 7 أيام",
    emoji: "🎉",
    badge: "عرض خاص",
    appliesTo: ["document", "copy"],
    discountPercent: 10,
    code: "NEXT10",
    validityDays: 7,
    theme: "gold",
  },
  {
    id: "doc_binding_free",
    type: "free_service",
    title: "تجليد مجاني! 📚",
    description: "طلبك مؤهل لتجليد لولبي مجاني — وفّر 150 دج على هذا الطلب",
    emoji: "📚",
    badge: "مفاجأة!",
    appliesTo: ["document"],
    minPages: 15,
    freeService: "تجليد لولبي مجاني",
    code: "FREEBIND",
    validityDays: 30,
    theme: "emerald",
  },
  {
    id: "doc_4th_free",
    type: "loyalty",
    title: "الطلب الرابع مجاناً! 🎁",
    description: "أكمل 3 طلبات مطبوعة والرابع مجاناً تماماً — ابدأ رحلتك معنا",
    emoji: "🎁",
    badge: "برنامج الولاء",
    appliesTo: ["document", "copy"],
    freeProduct: "طلب طباعة مجاني (حتى 50 صفحة)",
    code: "LOYAL4",
    validityDays: 90,
    theme: "purple",
  },
  // عروض للصور
  {
    id: "photo_lamination_free",
    type: "free_service",
    title: "تغليف لامع مجاني للصور! ✨",
    description: "صورك تستحق الأفضل — احصل على تغليف لامع فوتوغرافي مجاني",
    emoji: "✨",
    badge: "حصري للصور",
    appliesTo: ["photo"],
    freeService: "تغليف لامع مجاني",
    code: "PHOTOLAM",
    validityDays: 14,
    theme: "rose",
  },
  {
    id: "photo_50_off_4th",
    type: "loyalty",
    title: "خصم 50% على طلبك الرابع للصور! 📸",
    description: "اطبع 3 صور والرابعة بخصم 50% — لك وحدك",
    emoji: "📸",
    badge: "عرض الصور",
    appliesTo: ["photo"],
    discountPercent: 50,
    code: "PHOTO50",
    validityDays: 30,
    theme: "rose",
  },
  // عروض للبطاقات
  {
    id: "card_free_design",
    type: "free_service",
    title: "تصميم مجاني لبطاقاتك! 💎",
    description: "احصل على تصميم احترافي مجاني لبطاقات العمل مع طلبك",
    emoji: "💎",
    badge: "احترافي",
    appliesTo: ["card"],
    freeService: "تصميم بطاقات مجاني",
    code: "CARDFREE",
    validityDays: 21,
    theme: "blue",
  },
  // عروض للملصقات
  {
    id: "poster_15_off",
    type: "discount",
    title: "خصم 15% على الملصقات الكبيرة! 📜",
    description: "ملصقاتك تستحق التميّز — خصم 15% على مقاسات A1 و A0",
    emoji: "📜",
    badge: "عرض كبير",
    appliesTo: ["poster"],
    discountPercent: 15,
    code: "POSTER15",
    validityDays: 14,
    theme: "gold",
  },
  // عروض للتجليد
  {
    id: "binding_free_cover",
    type: "free_service",
    title: "غلاف فاخر مجاني! 📖",
    description: "مع تجليد كتابك، احصل على غلاف مقوّى فاخر مجاني",
    emoji: "📖",
    badge: "فاخر",
    appliesTo: ["binding"],
    freeService: "غلاف مقوّى مجاني",
    code: "BINDCOVER",
    validityDays: 30,
    theme: "emerald",
  },
  // عرض شامل
  {
    id: "combo_3_orders",
    type: "combo",
    title: "عرض الـ 3 طلبات! 🚀",
    description: "اطلب 3 مرات خلال شهر واحصل على خصم 25% على كل طلباتك القادمة",
    emoji: "🚀",
    badge: "الأكثر طلباً",
    appliesTo: ["document", "photo", "copy", "card", "poster", "binding"],
    discountPercent: 25,
    code: "COMBO3",
    validityDays: 30,
    theme: "purple",
  },
];

/**
 * اختيار عرض مناسب بناءً على مواصفات الملف المرفوع
 */
export function selectOffer(
  serviceType: string,
  pageCount?: number,
  copies?: number,
): Offer | null {
  // فلترة العروض المناسبة للخدمة
  const eligible = OFFERS.filter((offer) => {
    if (!offer.appliesTo.includes(serviceType)) return false;
    if (offer.minPages && (pageCount || 0) < offer.minPages) return false;
    if (offer.minCopies && (copies || 0) < offer.minCopies) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // اختيار عشوائي للتنويع (لكن ثابت لكل جلسة)
  const idx = Math.floor(Math.random() * eligible.length);
  return eligible[idx];
}

/**
 * ألوان الثيمات للعروض
 */
export const OFFER_THEMES: Record<string, {
  bg: string;
  border: string;
  text: string;
  badge: string;
  button: string;
  gradient: string;
}> = {
  gold: {
    bg: "from-amber-50 to-yellow-50",
    border: "border-amber-300",
    text: "text-amber-900",
    badge: "bg-amber-400 text-neutral-900",
    button: "bg-amber-400 hover:bg-amber-500 text-neutral-900",
    gradient: "from-amber-400 to-yellow-500",
  },
  emerald: {
    bg: "from-emerald-50 to-green-50",
    border: "border-emerald-300",
    text: "text-emerald-900",
    badge: "bg-emerald-500 text-white",
    button: "bg-emerald-500 hover:bg-emerald-600 text-white",
    gradient: "from-emerald-400 to-green-500",
  },
  rose: {
    bg: "from-rose-50 to-pink-50",
    border: "border-rose-300",
    text: "text-rose-900",
    badge: "bg-rose-500 text-white",
    button: "bg-rose-500 hover:bg-rose-600 text-white",
    gradient: "from-rose-400 to-pink-500",
  },
  blue: {
    bg: "from-blue-50 to-sky-50",
    border: "border-blue-300",
    text: "text-blue-900",
    badge: "bg-blue-500 text-white",
    button: "bg-blue-500 hover:bg-blue-600 text-white",
    gradient: "from-blue-400 to-sky-500",
  },
  purple: {
    bg: "from-purple-50 to-violet-50",
    border: "border-purple-300",
    text: "text-purple-900",
    badge: "bg-purple-500 text-white",
    button: "bg-purple-500 hover:bg-purple-600 text-white",
    gradient: "from-purple-400 to-violet-500",
  },
};
