"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Printer,
  BookOpen,
  Scissors,
  Palette,
  Image,
  Tag,
  Layers,
  PenTool,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  RotateCcw,
  Search,
  Sun,
  Moon,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { NewOrderWizard } from "@/components/app/new-order-wizard";
import { RepeatOrder } from "@/components/app/repeat-order";
import { TrackOrder } from "@/components/app/track-order";
import { OrderSuccess } from "@/components/app/order-success";
import { FloatingAssistant } from "@/components/app/floating-assistant";
import { useShop } from "@/lib/shop-context";
import type { FeatureKey } from "@/lib/shop-features";
import { getTheme, type ShopTheme } from "@/lib/themes";
import type { PrintOrderLite } from "@/lib/order-types";

const ICON_MAP: Record<string, LucideIcon> = {
  Printer,
  BookOpen,
  Scissors,
  Palette,
  Image,
  Tag,
  Layers,
  PenTool,
};

type View = "new" | "repeat" | "track";

export interface CreatedOrder {
  id: string;
  reference: string;
  serviceName: string;
  total: number;
  status: string;
  estimatedHours: number;
}

interface AppShellProps {
  shopId?: string | null;
  shopName?: string;
  shopPhone?: string | null;
  shopWhatsapp?: string | null;
  shopEmail?: string | null;
  shopAddress?: string | null;
  shopColor?: string | null;
  shopThemeId?: number | null;
  shopSlug?: string;
}

export function AppShell({
  shopId,
  shopName = "مطبعة الذكي",
  shopPhone,
  shopWhatsapp,
  shopEmail,
  shopAddress,
  shopColor,
  shopThemeId,
  shopSlug,
}: AppShellProps) {
  const { shop, hasFeature } = useShop();
  const theme = getTheme(shopThemeId || shop?.themeId);
  const searchParams = useSearchParams();
  const initialTrackRef = searchParams.get("track");
  const [view, setView] = useState<View>(initialTrackRef ? "track" : "new");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [prefillOrder, setPrefillOrder] = useState<PrintOrderLite | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [trackInitialQuery] = useState<string | null>(initialTrackRef || null);

  // الوضع الداكن
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleCreated = useCallback((order: CreatedOrder) => {
    setCreatedOrder(order);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRepeat = useCallback((order: PrintOrderLite) => {
    setPrefillOrder(order);
    setView("new");
  }, []);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillOrder(null);
  }, []);

  // أزرار التنقل
  const navItems: { key: View; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "new", label: "طلب جديد", shortLabel: "جديد", icon: Plus },
    { key: "repeat", label: "تكرار طلب", shortLabel: "تكرار", icon: RotateCcw },
    { key: "track", label: "تتبّع", shortLabel: "تتبّع", icon: Search },
  ];

  const displayPhone = shopPhone || shopWhatsapp || "0560 00 00 00";
  const whatsappNumber = shopWhatsapp || shopPhone || "0560000000";

  return (
    <div
      data-app-shell
      className="min-h-screen flex flex-col"
      dir="rtl"
      style={{
        backgroundColor: theme.contentBg,
        "--theme-top-bar-bg": theme.topBar.bg,
        "--theme-top-bar-text": theme.topBar.text,
        "--theme-top-bar-accent": theme.topBar.accent,
        "--theme-header-bg": theme.header.bg,
        "--theme-header-text": theme.header.text,
        "--theme-header-border": theme.header.border,
        "--theme-nav-active": theme.nav.active,
        "--theme-nav-active-text": theme.nav.activeText,
        "--theme-nav-hover": theme.nav.hover,
        "--theme-accent": theme.accent,
        "--theme-footer-bg": theme.footer.bg,
        "--theme-footer-text": theme.footer.text,
        "--theme-footer-border": theme.footer.border,
        "--theme-footer-link-hover": theme.footer.linkHover,
        "--theme-footer-icon": theme.footerIcon,
        "--theme-card-hover-bg": theme.card.hoverBg,
        "--theme-logo-icon-color": theme.logoIconColor,
      } as React.CSSProperties}
    >
      {/* ===== الشريط العلوي ===== */}
      <div style={{ backgroundColor: theme.topBar.bg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 sm:h-10 flex items-center justify-between gap-3">
          <div
            className="flex sm:hidden items-center gap-2 text-xs min-w-0"
            style={{ color: theme.topBar.text }}
          >
            <span style={{ color: theme.topBar.accent }}>⚡</span>
            <span className="truncate font-medium">اطلب خلال دقيقة</span>
          </div>
          <div
            className="hidden sm:flex items-center gap-5 md:gap-8 overflow-hidden text-xs"
            style={{ color: theme.topBar.text }}
          >
            <span className="flex items-center gap-2 whitespace-nowrap font-medium">
              <span style={{ color: theme.topBar.accent }}>⚡</span>
              اطلب خلال دقيقة
            </span>
            <span className="hidden md:flex items-center gap-2 whitespace-nowrap font-medium">
              <span style={{ color: theme.topBar.accent }}>🕐</span>
              جاهز خلال ساعة
            </span>
          </div>
          <a
            href={`tel:${displayPhone.replace(/\s/g, "")}`}
            className="top-bar-link flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all duration-200 active:scale-[0.98] whitespace-nowrap shrink-0 text-xs font-medium"
            style={{ color: theme.topBar.text }}
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{displayPhone}</span>
            <span className="sm:hidden">اتصل بنا</span>
          </a>
        </div>
      </div>

      {/* ===== الترويسة ===== */}
      <header
        className="shadow-sm sticky top-0 z-40 no-print"
        style={{ backgroundColor: theme.header.bg }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
          {/* الشعار */}
          <button
            onClick={() => setView("new")}
            className="flex items-center gap-3 shrink-0 min-w-0 transition-all duration-200 active:scale-[0.98]"
          >
            {shop?.logoUrl ? (
              <div
                className={`w-10 h-10 md:w-11 md:h-11 ${theme.logoStyle} overflow-hidden shadow-sm shrink-0 ring-1 ring-black/5`}
              >
                <img
                  src={shop.logoUrl}
                  alt={shopName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (() => {
              const IconComp = ICON_MAP[shop?.logoIcon || "Printer"] || Printer;
              return (
                <div
                  className={`w-10 h-10 md:w-11 md:h-11 ${theme.logoStyle} flex items-center justify-center shrink-0 shadow-sm`}
                  style={{ backgroundColor: shopColor || theme.logoIconColor }}
                >
                  <IconComp className="h-5 w-5 md:h-5.5 md:w-5.5 text-white" />
                </div>
              );
            })()}
            <div className="text-right min-w-0">
              <div
                className="font-bold text-sm md:text-base leading-tight truncate"
                style={{ color: theme.header.text }}
              >
                {shopName}
              </div>
              <div
                className="text-xs leading-tight truncate mt-0.5 header-subtitle"
              >
                <span className="sm:hidden">اطبع بسهولة</span>
                <span className="hidden sm:inline">اطبع بسهولة — أسرع من واتساب</span>
              </div>
            </div>
          </button>

          {/* أزرار الهيدر + التنقل حاسوب */}
          <div className="flex items-center gap-2 shrink-0">
            {/* زر الوضع الداكن */}
            {hasFeature("darkMode") && (
              <button
                onClick={() => setDarkMode((d) => !d)}
                className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 active:scale-[0.95]"
                aria-label={darkMode ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            {/* فاصل */}
            <div
              className="w-px h-6 hidden sm:block"
              style={{ backgroundColor: theme.header.border }}
            />

            {/* التنقل - حاسوب */}
            <nav
              className="hidden md:flex items-center gap-1 rounded-2xl p-1"
              style={{ backgroundColor: "color-mix(in srgb, var(--theme-header-border) 30%, white)" }}
            >
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`nav-pill flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    view === item.key
                      ? "nav-pill-active"
                      : "nav-pill-inactive"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* التنقل - الجوال */}
          <nav
            className="flex md:hidden items-center gap-1 rounded-2xl p-1 shrink-0"
            style={{ backgroundColor: "color-mix(in srgb, var(--theme-header-border) 30%, white)" }}
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`nav-pill flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.95] ${
                  view === item.key
                    ? "nav-pill-active"
                    : "nav-pill-inactive"
                }`}
                aria-label={item.label}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.shortLabel}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ===== المحتوى ===== */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            {view === "new" && (
              <NewOrderWizard
                onCreated={handleCreated}
                prefillOrder={prefillOrder}
                onPrefillConsumed={handlePrefillConsumed}
                shopId={shopId}
              />
            )}
            {view === "repeat" && (
              <RepeatOrder onRepeat={handleRepeat} shopId={shopId} />
            )}
            {view === "track" && <TrackOrder key={refreshKey} shopId={shopId} initialQuery={trackInitialQuery} />}
          </div>
        </div>

        {/* ===== التذييل ===== */}
        <footer
          className="mt-auto no-print"
          style={{
            backgroundColor: theme.footer.bg,
            borderTop: `1px solid ${theme.footer.border}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {/* العمود الأول: الشعار والوصف */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {shop?.logoUrl ? (
                    <div
                      className={`w-10 h-10 ${theme.logoStyle} overflow-hidden shadow-sm ring-1 ring-white/10`}
                    >
                      <img src={shop.logoUrl} alt={shopName} className="w-full h-full object-cover" />
                    </div>
                  ) : (() => {
                    const FIconComp = ICON_MAP[shop?.logoIcon || "Printer"] || Printer;
                    return (
                      <div
                        className={`w-10 h-10 ${theme.logoStyle} flex items-center justify-center shadow-sm`}
                        style={{ backgroundColor: shopColor || theme.logoIconColor }}
                      >
                        <FIconComp className="h-5 w-5 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="font-bold text-sm text-white">{shopName}</div>
                    <div className="text-xs" style={{ color: theme.footer.text }}>
                      اطبع بسهولة
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: theme.footer.text }}>
                  خدمة طباعة احترافية وسريعة. اطبع مستنداتك وصورك وبطاقاتك
                  أونلاين وتابع طلبك لحظة بلحظة.
                </p>
              </div>

              {/* العمود الثاني: روابط سريعة */}
              <div>
                <h4 className="font-semibold text-sm text-white mb-4">روابط سريعة</h4>
                <div className="space-y-2">
                  {[
                    { label: "طلب طباعة جديد", viewKey: "new" as View },
                    { label: "تتبّع طلب", viewKey: "track" as View },
                    { label: "إعادة طلب سابق", viewKey: "repeat" as View },
                  ].map((link) => (
                    <button
                      key={link.viewKey}
                      onClick={() => setView(link.viewKey)}
                      className="footer-quick-link flex items-center justify-between w-full px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                      style={{ backgroundColor: theme.card.hoverBg }}
                    >
                      <span
                        className="footer-link-text text-sm font-medium transition-colors"
                        style={{ color: theme.header.text }}
                      >
                        {link.label}
                      </span>
                      <ChevronLeft
                        className="footer-chevron h-4 w-4 transition-all duration-200"
                        style={{ color: theme.footer.text }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* العمود الثالث: تواصل معنا */}
              <div>
                <h4 className="font-semibold text-sm text-white mb-4">تواصل معنا</h4>
                <div className="space-y-2.5">
                  {shopAddress && (
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                      style={{ backgroundColor: theme.card.hoverBg }}
                    >
                      <div className="footer-icon-box w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="text-sm leading-relaxed" style={{ color: theme.header.text }}>
                        {shopAddress}
                      </span>
                    </div>
                  )}
                  {displayPhone && (
                    <a
                      href={`tel:${displayPhone.replace(/\s/g, "")}`}
                      className="flex items-center gap-3 p-3 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      style={{ backgroundColor: theme.card.hoverBg }}
                    >
                      <div className="footer-icon-box w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="text-sm" style={{ color: theme.header.text }}>
                        {displayPhone}
                      </span>
                    </a>
                  )}
                  {shopWhatsapp && (
                    <a
                      href={(() => {
                        const digits = whatsappNumber.replace(/\D/g, "");
                        const raw = digits.startsWith("0") ? digits.substring(1) : digits;
                        const phone = raw.startsWith("213") ? raw : `213${raw}`;
                        return `https://wa.me/${phone}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      style={{ backgroundColor: theme.card.hoverBg }}
                    >
                      <div className="footer-icon-box w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <span className="text-sm" style={{ color: theme.header.text }}>
                        واتساب
                      </span>
                    </a>
                  )}
                  {shopEmail && (
                    <a
                      href={`mailto:${shopEmail}`}
                      className="flex items-center gap-3 p-3 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      style={{ backgroundColor: theme.card.hoverBg }}
                    >
                      <div className="footer-icon-box w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="text-sm" style={{ color: theme.header.text }}>
                        {shopEmail}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* حقوق النشر */}
            <div
              className="mt-10 pt-6 text-center"
              style={{ borderTop: `1px solid ${theme.footer.border}` }}
            >
              <div className="text-xs" style={{ color: theme.footer.text }}>
                © {new Date().getFullYear()} {shopName} — جميع الحقوق محفوظة
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* نافذة نجاح الطلب */}
      <OrderSuccess
        order={createdOrder}
        open={!!createdOrder}
        onClose={() => {
          setCreatedOrder(null);
          handleRefresh();
        }}
        onNavigate={(v) => setView(v as View)}
        shopName={shopName}
        shopId={shopId}
      />

      {/* الزر العائم */}
      <FloatingAssistant
        onRepeatOrder={() => setView("repeat")}
        whatsappNumber={whatsappNumber}
        shopName={shopName}
        theme={theme}
      />

      <SonnerToaster position="top-center" dir="rtl" />

      {/* أنماط القالب + الوضع الداكن */}
      <style>{`
        /* ---- Top bar hover ---- */
        [data-app-shell] .top-bar-link:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }

        /* ---- Header subtitle (muted text) ---- */
        [data-app-shell] .header-subtitle {
          color: color-mix(in srgb, var(--theme-header-text) 45%, transparent);
        }

        /* ---- Nav pills ---- */
        [data-app-shell] .nav-pill-active {
          background-color: var(--theme-nav-active) !important;
          color: var(--theme-nav-active-text) !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        [data-app-shell] .nav-pill-inactive {
          color: color-mix(in srgb, var(--theme-header-text) 50%, transparent);
        }
        [data-app-shell] .nav-pill-inactive:hover {
          background-color: var(--theme-nav-hover);
          color: var(--theme-header-text);
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        /* ---- Footer quick-link chevron hover ---- */
        [data-app-shell] .footer-quick-link:hover .footer-chevron {
          color: var(--theme-footer-link-hover) !important;
          transform: translateX(-2px);
        }

        /* ---- Footer icon boxes (tinted accent) ---- */
        [data-app-shell] .footer-icon-box {
          background-color: color-mix(in srgb, var(--theme-accent) 12%, white);
          color: var(--theme-accent);
        }

        /* ---- Dark mode (separate feature) ---- */
        html.dark body, html.dark {
          filter: invert(1) hue-rotate(180deg);
        }
        html.dark img, html.dark video, html.dark canvas {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>
    </div>
  );
}