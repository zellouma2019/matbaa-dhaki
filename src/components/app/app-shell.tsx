"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  LayoutGrid,
  Plus,
  Printer,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  RotateCcw,
  Search,
  ChevronUp,
  Info,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { NewOrderWizard } from "@/components/app/new-order-wizard";
import { RepeatOrder } from "@/components/app/repeat-order";
import { TrackOrder } from "@/components/app/track-order";
import { AdminPanel } from "@/components/app/admin-panel";
import { OrderSuccess } from "@/components/app/order-success";
import { AdminGate } from "@/components/app/admin-gate";
import { FloatingAssistant } from "@/components/app/floating-assistant";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Intro } from "@/components/app/intro";
import { useAppStore, type CreatedOrder } from "@/lib/store";
import { useShop } from "@/lib/shop-context";
import { getTheme } from "@/lib/themes";
import type { PrintOrderLite } from "@/lib/order-types";

type View = "new" | "repeat" | "track" | "admin";

interface AppShellProps {
  shopId: string;
  shopName: string;
  shopPhone?: string | null;
  shopWhatsapp?: string | null;
  shopEmail?: string | null;
  shopAddress?: string | null;
  shopColor?: string | null;
  shopThemeId?: number;
  shopSlug: string;
}

export { type CreatedOrder };

export function AppShell({
  shopId,
  shopName,
  shopPhone,
  shopWhatsapp,
  shopEmail,
  shopAddress,
  shopColor,
  shopThemeId,
  shopSlug,
}: AppShellProps) {
  const [footerOpen, setFooterOpen] = useState(false);
  const [showAdminNav, setShowAdminNav] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('preview') === '1';
  });
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { shop } = useShop();
  const theme = getTheme(shopThemeId || 1, shopColor);

  const {
    view,
    setView,
    createdOrder,
    setCreatedOrder,
    prefillOrder,
    setPrefillOrder,
    adminUnlocked,
    setAdminUnlocked,
    adminGateOpen,
    setAdminGateOpen,
    refreshKey,
    incrementRefresh,
    showIntro,
    setShowIntro,
    setShopId,
  } = useAppStore();

  // تعيين shopId في المتجر عند التحميل
  useEffect(() => {
    setShopId(shopId);
  }, [shopId, setShopId]);



  const handleCreated = useCallback((order: CreatedOrder) => {
    setCreatedOrder(order);
  }, [setCreatedOrder]);

  const handleRepeat = useCallback((order: PrintOrderLite) => {
    setPrefillOrder(order);
    setView("new");
  }, [setPrefillOrder, setView]);

  const handlePrefillConsumed = useCallback(() => {
    setPrefillOrder(null);
  }, [setPrefillOrder]);

  const handleNavClick = useCallback(
    (key: View) => {
      if (key === "admin" && !adminUnlocked) {
        setAdminGateOpen(true);
        return;
      }
      if (key === "new") setFooterOpen(false);
      setView(key);
    },
    [adminUnlocked, setAdminGateOpen, setView],
  );

  const handleAdminUnlock = useCallback(() => {
    setAdminUnlocked(true);
    setAdminGateOpen(false);
    setView("admin");
  }, [setAdminUnlocked, setAdminGateOpen, setView]);

  const handleCloseOrderSuccess = useCallback(() => {
    setCreatedOrder(null);
    incrementRefresh();
  }, [setCreatedOrder, incrementRefresh]);

  // عناصر التنقل (الإدارة تظهر فقط في وضع المعاينة)
  const navItems: { key: View; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }>; show: boolean }[] = [
    { key: "new", label: "طلب جديد", shortLabel: "جديد", icon: Plus, show: true },
    { key: "repeat", label: "تكرار طلب", shortLabel: "تكرار", icon: RotateCcw, show: true },
    { key: "track", label: "تتبّع", shortLabel: "تتبّع", icon: Search, show: true },
    { key: "admin", label: "الإدارة", shortLabel: "إدارة", icon: LayoutGrid, show: showAdminNav },
  ];
  const visibleNavItems = navItems.filter((i) => i.show);

  const displayPhone = shopPhone || "0560 00 00 00";
  const displayWhatsapp = shopWhatsapp || shopPhone || "0560000000";

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center animate-pulse">
          <Printer className="h-5 w-5 text-amber-400" />
        </div>
      </div>
    );
  }

  return (
    <>
    {showIntro && <Intro onFinish={() => setShowIntro(false)} />}
    <LayoutGroup>
      <div className="min-h-screen flex flex-col bg-background" dir="rtl" style={theme.rootVars as React.CSSProperties}>
      {/* ===== الشريط العلوي ===== */}
      {view !== "new" && (
      <div className="bg-neutral-900 text-neutral-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-8 sm:h-9 flex items-center justify-between gap-2">
          <div className="flex sm:hidden items-center gap-1.5 text-xs min-w-0">
            <span className="text-amber-400 shrink-0">⚡</span>
            <span className="truncate">اطلب خلال دقيقة</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 md:gap-6 overflow-hidden text-xs">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400">⚡</span> اطلب خلال دقيقة
            </span>
            <span className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400">🕐</span> جاهز خلال ساعة
            </span>
            <span className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400">🔔</span> إشعار عند الجاهزية
            </span>
          </div>
          {displayPhone && (
            <a
              href={`tel:${displayPhone.replace(/\s/g, "")}`}
              className="flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap shrink-0 text-xs"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{displayPhone}</span>
              <span className="sm:hidden">اتصل بنا</span>
            </a>
          )}
        </div>
      </div>
      )}

      {/* ===== الترويسة ===== */}
      <header className="bg-white border-b border-border sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 md:h-16 flex items-center justify-between gap-2">
          <button
            onClick={() => { setFooterOpen(false); setView("new"); }}
            className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
              <Printer className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
            </div>
            <div className="text-right min-w-0">
              <div className="font-bold text-sm md:text-base leading-tight truncate">{shopName}</div>
              <div className="text-xs text-muted-foreground leading-tight truncate">
                <span className="sm:hidden">اطبع بسهولة</span>
                <span className="hidden sm:inline">اطبع بسهولة — أسرع من واتساب</span>
              </div>
            </div>
          </button>

          {/* التنقل - حاسوب */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
            {visibleNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  view === item.key ? "text-white" : "text-foreground hover:bg-background"
                }`}
              >
                {view === item.key && (
                  <motion.div
                    layoutId="nav-active-desktop"
                    className="absolute inset-0 bg-neutral-900 rounded-full shadow-sm"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
                {item.key === "admin" && !adminUnlocked && (
                  <svg className="h-3 w-3 text-amber-500 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                )}
              </button>
            ))}
          </nav>

          {/* التنقل - الجوال */}
          <nav className="flex md:hidden items-center gap-1 bg-muted/60 rounded-full p-1 shrink-0">
            {visibleNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  view === item.key ? "text-white" : "text-foreground hover:bg-background"
                }`}
                aria-label={item.label}
              >
                {view === item.key && (
                  <motion.div
                    layoutId="nav-active-mobile"
                    className="absolute inset-0 bg-neutral-900 rounded-full"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="h-4 w-4 relative z-10" />
                {item.key === "admin" && !adminUnlocked && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ===== المحتوى ===== */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 py-4 md:py-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 w-full">
            <AnimatePresence mode="wait">
              {view === "new" && (
                <motion.div key="view-new" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                  <NewOrderWizard onCreated={handleCreated} prefillOrder={prefillOrder} onPrefillConsumed={handlePrefillConsumed} />
                </motion.div>
              )}
              {view === "repeat" && (
                <motion.div key="view-repeat" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                  <RepeatOrder onRepeat={handleRepeat} />
                </motion.div>
              )}
              {view === "track" && (
                <motion.div key="view-track" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                  <TrackOrder key={refreshKey} />
                </motion.div>
              )}
              {view === "admin" && (
                <motion.div key="view-admin" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                  <AdminPanel key={refreshKey} onRefresh={incrementRefresh} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ===== التذييل ===== */}
        {view !== "admin" && (
        <footer className="bg-neutral-900 text-neutral-300 mt-auto no-print">
          <button
            onClick={() => setFooterOpen(!footerOpen)}
            className="md:hidden w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs text-neutral-400 hover:text-amber-400 transition-colors border-b border-neutral-800/60 active:bg-neutral-800/50"
            aria-expanded={footerOpen}
            aria-label={footerOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          >
            <Info className="h-3.5 w-3.5" />
            <span className="font-medium">{footerOpen ? "إخفاء التفاصيل" : `عرض معلومات ${shopName}`}</span>
            <motion.div animate={{ rotate: footerOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
              <ChevronUp className="h-4 w-4" />
            </motion.div>
          </button>

          <div className="footer-collapse" style={footerOpen ? { maxHeight: "2000px" } : undefined}>
            <div className="max-w-7xl mx-auto px-4 py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center">
                      <Store className="h-5 w-5 text-neutral-900" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{shopName}</div>
                      <div className="text-xs text-neutral-400">اطبع بسهولة</div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    خدمة طباعة احترافية وسريعة. اطبع مستنداتك وصورك وبطاقاتك أونلاين وتابع طلبك لحظة بلحظة.
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">روابط سريعة</h4>
                  <ul className="space-y-2 text-xs">
                    <li><button onClick={() => { setFooterOpen(false); setView("new"); }} className="hover:text-amber-400 transition-colors">طلب طباعة جديد</button></li>
                    <li><button onClick={() => setView("track")} className="hover:text-amber-400 transition-colors">تتبّع طلب</button></li>
                    {showAdminNav && (
                      <li><button onClick={() => handleNavClick("admin")} className="hover:text-amber-400 transition-colors">لوحة الإدارة</button></li>
                    )}
                    <li><button onClick={() => setView("repeat")} className="hover:text-amber-400 transition-colors">إعادة طلب سابق</button></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">خدماتنا</h4>
                  <ul className="space-y-2 text-xs text-neutral-400">
                    <li>🖨️ طباعة مستند</li>
                    <li>📄 نسخ مستندات</li>
                    <li>🖼️ طباعة صور</li>
                    <li>📚 تجليد</li>
                    <li>🪪 بطاقات</li>
                    <li>📜 ملصقات</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">تواصل معنا</h4>
                  <ul className="space-y-3 text-xs">
                    {shopAddress && (
                      <li className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{shopAddress}</span>
                      </li>
                    )}
                    {displayPhone && (
                      <li className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-amber-400" />
                        <span>{displayPhone}</span>
                      </li>
                    )}
                    {displayWhatsapp && (
                      <li className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-amber-400" />
                        <span>واتساب</span>
                      </li>
                    )}
                    {shopEmail && (
                      <li className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-400" />
                        <span>{shopEmail}</span>
                      </li>
                    )}
                    <li className="flex items-start gap-2 pt-2 border-t border-neutral-700">
                      <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div>السبت - الخميس: 8:00 ص — 7:00 م</div>
                        <div className="text-neutral-500">الجمعة: مغلق</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-neutral-800 text-center text-xs text-neutral-500">
                © {new Date().getFullYear()} {shopName} — جميع الحقوق محفوظة
              </div>
            </div>
          </div>
        </footer>
        )}
      </main>

      <OrderSuccess order={createdOrder} open={!!createdOrder} onClose={handleCloseOrderSuccess} onNavigate={(v) => { if (v === "new") setFooterOpen(false); setView(v as View); }} />
      <AdminGate open={adminGateOpen} onClose={() => setAdminGateOpen(false)} onSuccess={handleAdminUnlock} />
      <FloatingAssistant onRepeatOrder={() => setView("repeat")} />
      <SonnerToaster position="top-center" dir="rtl" />
      </div>
    </LayoutGroup>
    </>
  );
}