// الإعدادات الافتراضية للنظام - تُستخدم عند أول تشغيل
import { SPEC_LIST } from "@/lib/service-specs";
import { DELIVERY_OPTIONS } from "@/lib/print-config";

export interface IntroSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  emoji: string;
  bgIcon: string; // أيقونة خلفية (lucide icon name أو emoji)
  duration: number; // المدة بالميلي ثانية
  footerText: string;
  bgColor: string; // لون الخلفية
  accentColor: string; // اللون المميز
  showProgress: boolean;
  showSpinningRing: boolean;
}

export interface AppSettings {
  services: typeof SPEC_LIST;
  deliveryOptions: typeof DELIVERY_OPTIONS;
  general: {
    quantityDiscount10: number; // خصم 10 نسخ %
    quantityDiscount50: number; // خصم 50 نسخ %
    sidesDiscount: number; // خصم الوجهين %
    minOrder: number; // أدنى مبلغ
    whatsappNumber: string;
    phoneNumber: string;
    email: string;
    address: string;
    workHours: string;
    adminCode: string;
    autoDeleteDays: number;
  };
  intro: IntroSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  services: SPEC_LIST,
  deliveryOptions: DELIVERY_OPTIONS,
  general: {
    quantityDiscount10: 10,
    quantityDiscount50: 15,
    sidesDiscount: 50,
    minOrder: 10,
    whatsappNumber: "0560000000",
    phoneNumber: "0560000000",
    email: "contact@matbaa-dhaki.dz",
    address: "شارع ديدوش مراد، الجزائر العاصمة، الجزائر",
    workHours: "السبت - الخميس: 8:00 ص — 7:00 م",
    adminCode: "2514",
    autoDeleteDays: 10,
  },
  intro: {
    enabled: true,
    title: "مطبعة الذكي",
    subtitle: "اطبع بسهولة — أسرع من واتساب",
    emoji: "🖨️",
    bgIcon: "Printer",
    duration: 4200,
    footerText: "🇩🇿 صُمّم بحب في الجزائر",
    bgColor: "#1a1a1a",
    accentColor: "#D4AF37",
    showProgress: true,
    showSpinningRing: true,
  },
};