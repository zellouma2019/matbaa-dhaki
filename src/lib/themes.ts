// ============================================================
// نظام القوالب اللونية — 8 قوالب مميزة لكل متجر
// ============================================================

export interface ShopTheme {
  id: number;
  name: string;
  /// ألوان الشريط العلوي
  topBar: { bg: string; text: string; accent: string };
  /// ألوان الترويسة
  header: { bg: string; text: string; border: string };
  /// ألوان التنقل (التاب النشط)
  nav: { active: string; activeText: string; hover: string };
  /// اللون الأساسي المميز
  accent: string;
  /// ألوان الأيقونات في الفوتر
  footerIcon: string;
  /// ألوان التذييل
  footer: { bg: string; text: string; border: string; linkHover: string };
  /// ألوان الزر العائم
  fab: { bg: string; hover: string; icon: string };
  /// خلفية خفيفة للمحتوى
  contentBg: string;
  /// ألوان البطاقات والعناصر
  card: { border: string; hoverBg: string };
  /// شكل الشعار الافتراضي
  logoStyle: "rounded-xl" | "rounded-2xl" | "rounded-full" | "rounded-lg";
  /// لون أيقونة الطابعة
  logoIconColor: string;
}

export const SHOP_THEMES: ShopTheme[] = [
  // ===== 1: كلاسيكي أسود + ذهبي (الافتراضي) =====
  {
    id: 1,
    name: "كلاسيكي ذهبي",
    topBar: { bg: "#171717", text: "#e5e5e5", accent: "#f59e0b" },
    header: { bg: "#ffffff", text: "#171717", border: "#e5e5e5" },
    nav: { active: "#171717", activeText: "#ffffff", hover: "#f5f5f5" },
    accent: "#f59e0b",
    footerIcon: "#f59e0b",
    footer: { bg: "#171717", text: "#d4d4d4", border: "#262626", linkHover: "#f59e0b" },
    fab: { bg: "#f59e0b", hover: "#d97706", icon: "#171717" },
    contentBg: "#ffffff",
    card: { border: "#e5e5e5", hoverBg: "#fafafa" },
    logoStyle: "rounded-xl",
    logoIconColor: "#f59e0b",
  },

  // ===== 2: أخضر زمردي + أبيض =====
  {
    id: 2,
    name: "أخضر زمردي",
    topBar: { bg: "#064e3b", text: "#d1fae5", accent: "#34d399" },
    header: { bg: "#ffffff", text: "#064e3b", border: "#d1fae5" },
    nav: { active: "#059669", activeText: "#ffffff", hover: "#ecfdf5" },
    accent: "#059669",
    footerIcon: "#34d399",
    footer: { bg: "#064e3b", text: "#a7f3d0", border: "#065f46", linkHover: "#34d399" },
    fab: { bg: "#059669", hover: "#047857", icon: "#ffffff" },
    contentBg: "#ffffff",
    card: { border: "#d1fae5", hoverBg: "#ecfdf5" },
    logoStyle: "rounded-2xl",
    logoIconColor: "#059669",
  },

  // ===== 3: أزرق داكن + سماوي =====
  {
    id: 3,
    name: "أزرق محترف",
    topBar: { bg: "#1e3a5f", text: "#bfdbfe", accent: "#38bdf8" },
    header: { bg: "#ffffff", text: "#1e3a5f", border: "#bfdbfe" },
    nav: { active: "#2563eb", activeText: "#ffffff", hover: "#eff6ff" },
    accent: "#2563eb",
    footerIcon: "#38bdf8",
    footer: { bg: "#1e3a5f", text: "#93c5fd", border: "#1e40af", linkHover: "#38bdf8" },
    fab: { bg: "#2563eb", hover: "#1d4ed8", icon: "#ffffff" },
    contentBg: "#ffffff",
    card: { border: "#bfdbfe", hoverBg: "#eff6ff" },
    logoStyle: "rounded-lg",
    logoIconColor: "#2563eb",
  },

  // ===== 4: بني + كريمي (دافئ) =====
  {
    id: 4,
    name: "بني دافئ",
    topBar: { bg: "#44403c", text: "#e7e5e4", accent: "#fbbf24" },
    header: { bg: "#fefce8", text: "#44403c", border: "#fde68a" },
    nav: { active: "#92400e", activeText: "#ffffff", hover: "#fef3c7" },
    accent: "#b45309",
    footerIcon: "#fbbf24",
    footer: { bg: "#292524", text: "#d6d3d1", border: "#44403c", linkHover: "#fbbf24" },
    fab: { bg: "#b45309", hover: "#92400e", icon: "#ffffff" },
    contentBg: "#fffbeb",
    card: { border: "#fde68a", hoverBg: "#fef3c7" },
    logoStyle: "rounded-xl",
    logoIconColor: "#92400e",
  },

  // ===== 5: بنفسجي + وردي =====
  {
    id: 5,
    name: "بنفسجي عصري",
    topBar: { bg: "#3b0764", text: "#e9d5ff", accent: "#c084fc" },
    header: { bg: "#ffffff", text: "#3b0764", border: "#e9d5ff" },
    nav: { active: "#7c3aed", activeText: "#ffffff", hover: "#f5f3ff" },
    accent: "#7c3aed",
    footerIcon: "#c084fc",
    footer: { bg: "#2e1065", text: "#c4b5fd", border: "#4c1d95", linkHover: "#c084fc" },
    fab: { bg: "#7c3aed", hover: "#6d28d9", icon: "#ffffff" },
    contentBg: "#ffffff",
    card: { border: "#e9d5ff", hoverBg: "#f5f3ff" },
    logoStyle: "rounded-2xl",
    logoIconColor: "#7c3aed",
  },

  // ===== 6: أحمر غامق + ذهبي =====
  {
    id: 6,
    name: "أحمر أنيق",
    topBar: { bg: "#7f1d1d", text: "#fecaca", accent: "#fca5a5" },
    header: { bg: "#ffffff", text: "#7f1d1d", border: "#fecaca" },
    nav: { active: "#b91c1c", activeText: "#ffffff", hover: "#fef2f2" },
    accent: "#dc2626",
    footerIcon: "#fbbf24",
    footer: { bg: "#450a0a", text: "#fca5a5", border: "#7f1d1d", linkHover: "#fbbf24" },
    fab: { bg: "#dc2626", hover: "#b91c1c", icon: "#ffffff" },
    contentBg: "#ffffff",
    card: { border: "#fecaca", hoverBg: "#fef2f2" },
    logoStyle: "rounded-full",
    logoIconColor: "#b91c1c",
  },

  // ===== 7: رمادي فاتح + أزرق مخضر (تيل) =====
  {
    id: 7,
    name: "تيل هادئ",
    topBar: { bg: "#134e4a", text: "#ccfbf1", accent: "#5eead4" },
    header: { bg: "#f0fdfa", text: "#134e4a", border: "#99f6e4" },
    nav: { active: "#0d9488", activeText: "#ffffff", hover: "#f0fdfa" },
    accent: "#0d9488",
    footerIcon: "#5eead4",
    footer: { bg: "#042f2e", text: "#99f6e4", border: "#134e4a", linkHover: "#5eead4" },
    fab: { bg: "#0d9488", hover: "#0f766e", icon: "#ffffff" },
    contentBg: "#f0fdfa",
    card: { border: "#99f6e4", hoverBg: "#ccfbf1" },
    logoStyle: "rounded-xl",
    logoIconColor: "#0d9488",
  },

  // ===== 8: برتقالي + رمادي غامق =====
  {
    id: 8,
    name: "برتقالي حيوي",
    topBar: { bg: "#1c1917", text: "#e7e5e4", accent: "#fb923c" },
    header: { bg: "#ffffff", text: "#1c1917", border: "#fed7aa" },
    nav: { active: "#ea580c", activeText: "#ffffff", hover: "#fff7ed" },
    accent: "#ea580c",
    footerIcon: "#fb923c",
    footer: { bg: "#1c1917", text: "#d6d3d1", border: "#292524", linkHover: "#fb923c" },
    fab: { bg: "#ea580c", hover: "#c2410c", icon: "#ffffff" },
    contentBg: "#ffffff",
    card: { border: "#fed7aa", hoverBg: "#fff7ed" },
    logoStyle: "rounded-lg",
    logoIconColor: "#ea580c",
  },
];

/// جلب قالب بالمعرّف (يُرجع الافتراضي إذا لم يُجد)
export function getTheme(id: number | null | undefined): ShopTheme {
  if (id && id >= 1 && id <= SHOP_THEMES.length) {
    return SHOP_THEMES[id - 1];
  }
  return SHOP_THEMES[0];
}

/// تدوير تلقائي — يُرجع themeId التالي (للاستخدام عند إنشاء متجر)
let lastThemeCounter = 0;
export function getNextThemeId(): number {
  lastThemeCounter = (lastThemeCounter % SHOP_THEMES.length) + 1;
  return lastThemeCounter;
}