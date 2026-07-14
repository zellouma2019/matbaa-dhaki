"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, X, Sparkles, Gift, Clock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { type Offer, OFFER_THEMES } from "@/lib/offers";
import { useShop } from "@/lib/shop-context";

interface OfferPopupProps {
  offer: Offer | null;
  open: boolean;
  onClose: () => void;
  onAccept?: (offer: Offer) => void;
}

export function OfferPopup({ offer, open, onClose, onAccept }: OfferPopupProps) {
  const { shop, hasFeature } = useShop();
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(t);
    }
  }, [open]);

  // إخفاء النافذة بالكامل إذا كانت الميزة غير مفعّلة أو لا يوجد عرض
  if (!hasFeature("specialOffers") || !offer) return null;

  const theme = OFFER_THEMES[offer.theme] || OFFER_THEMES.gold;

  function copyCode() {
    navigator.clipboard.writeText(offer!.code);
    setCopied(true);
    toast.success("تم نسخ كود الخصم!", {
      description: `الكود: ${offer!.code}`,
    });
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAccept() {
    if (onAccept) onAccept(offer!);
    copyCode();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-0" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">عرض خاص لك</DialogTitle>

        {/* ===== الخلفية المتدرجة + الكونفيتي ===== */}
        <div className={`relative bg-gradient-to-br ${theme.bg} overflow-hidden`}>
          {/* زر الإغلاق */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4 text-neutral-700" />
          </button>

          {/* الكونفيتي */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute text-xl animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random()}s`,
                    opacity: 0.7,
                  }}
                >
                  {["🎉", "✨", "🎊", "⭐", "💫"][i % 5]}
                </span>
              ))}
            </div>
          )}

          {/* المحتوى */}
          <div className="relative z-10 p-6 text-center">
            {/* الشارة */}
            {offer.badge && (
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${theme.badge} mb-4 animate-in fade-in zoom-in duration-500`}>
                <Sparkles className="h-3 w-3" />
                {offer.badge}
              </div>
            )}

            {/* الأيقونة الكبيرة */}
            <div className={`text-6xl mb-3 animate-in zoom-in duration-700`} style={{ animationDelay: "0.1s" }}>
              {offer.emoji}
            </div>

            {/* العنوان */}
            <h2 className={`text-xl font-bold ${theme.text} mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500`} style={{ animationDelay: "0.2s" }}>
              {offer.title}
            </h2>

            {/* الوصف */}
            <p className={`text-sm ${theme.text} opacity-80 mb-4 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500`} style={{ animationDelay: "0.3s" }}>
              {offer.description}
            </p>

            {/* كود الخصم */}
            <div className={`inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border-2 ${theme.border} mb-4 animate-in zoom-in duration-500`} style={{ animationDelay: "0.4s" }}>
              <span className="text-xs text-muted-foreground">الكود:</span>
              <span className="font-mono font-bold text-base text-neutral-900 tracking-wider">{offer.code}</span>
              <button
                onClick={copyCode}
                className="w-7 h-7 rounded-lg bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center transition-colors"
                aria-label="نسخ الكود"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-amber-400" />
                )}
              </button>
            </div>

            {/* مدة الصلاحية */}
            <div className={`flex items-center justify-center gap-1.5 text-xs ${theme.text} opacity-70 mb-4 animate-in fade-in duration-500`} style={{ animationDelay: "0.5s" }}>
              <Clock className="h-3.5 w-3.5" />
              صالح لمدة {offer.validityDays} {offer.validityDays === 1 ? "يوم" : offer.validityDays <= 10 ? "أيام" : "يومًا"}
            </div>

            {/* الأزرار */}
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "0.6s" }}>
              <Button
                onClick={handleAccept}
                className={`w-full ${theme.button} h-12 font-bold text-sm shadow-lg`}
              >
                <Gift className="h-4 w-4" />
                احصل على العرض الآن
              </Button>
              <button
                onClick={onClose}
                className={`w-full text-xs ${theme.text} opacity-60 hover:opacity-100 transition-opacity py-2`}
              >
                لا شكراً، متابعة الطلب
              </button>
            </div>
          </div>

          {/* زخارف خلفية */}
          <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10`} />
          <div className={`absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10`} />
        </div>

        {/* تذييل صغير */}
        <div className="bg-neutral-900 text-neutral-400 text-xs text-center py-2">
          🎁 عرض حصري من {shop?.name || "المتجر"} · يُطبّق على طلبك القادم
        </div>
      </DialogContent>
    </Dialog>
  );
}
