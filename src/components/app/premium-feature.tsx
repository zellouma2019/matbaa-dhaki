"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, MessageCircle, Phone, X } from "lucide-react";
import type { FeatureDef } from "@/lib/shop-features";

// ============================================================
// شارة PRO الصغيرة — توضع بجانب الميزة المقفلة
// ============================================================

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className = "", size = "sm" }: PremiumBadgeProps) {
  return (
    <Badge
      className={`
        bg-gradient-to-l from-amber-500 to-amber-400 text-neutral-900
        border-amber-500 font-bold gap-0.5 shrink-0
        ${size === "sm" ? "text-[9px] px-1.5 py-0 h-4" : "text-[10px] px-2 py-0.5 h-5"}
        ${className}
      `}
    >
      <Crown className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      PRO
    </Badge>
  );
}

// ============================================================
// شارة قفل للميزة المقفلة
// ============================================================

interface FeatureLockBadgeProps {
  className?: string;
}

export function FeatureLockBadge({ className = "" }: FeatureLockBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 text-amber-600 text-xs font-medium
        ${className}
      `}
    >
      <Lock className="h-3 w-3" />
      <span className="hidden sm:inline">ميزة مدفوعة</span>
    </span>
  );
}

// ============================================================
// نافذة "تواصل معنا" عند النقر على ميزة مقفلة
// ============================================================

interface PremiumLockDialogProps {
  open: boolean;
  onClose: () => void;
  feature: FeatureDef | null;
  /** رقم واتساب المالك (للعرض في النافذة) */
  ownerPhone?: string | null;
  ownerWhatsapp?: string | null;
  shopName?: string;
}

export function PremiumLockDialog({
  open,
  onClose,
  feature,
  ownerPhone,
  ownerWhatsapp,
  shopName,
}: PremiumLockDialogProps) {
  const contactNumber = ownerWhatsapp || ownerPhone || "0560000000";

  function openWhatsApp() {
    const msg = `مرحباً، أريد تفعيل ميزة "${feature?.label || ""}" لمتجري${shopName ? ` (${shopName})` : ""}. هل يمكنكم مساعدتي؟`;
    const url = `https://wa.me/213${contactNumber.substring(1)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function openCall() {
    window.open(`tel:${contactNumber.replace(/\s/g, "")}`, "_self");
  }

  if (!feature) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogTitle className="sr-only">ميزة مدفوعة</DialogTitle>

        {/* رأس ذهبي */}
        <div className="bg-gradient-to-bl from-amber-50 to-white p-6 text-center border-b border-amber-200/50">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-bl from-amber-400 to-amber-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-200">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">{feature.label}</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* المحتوى */}
        <div className="p-5 space-y-4">
          {/* لماذا هذه الميزة؟ */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>💡 لماذا تحتاجها؟</strong> هذه الميزة متاحة في النسخة المدفوعة فقط.
              تواصل معنا لتفعيلها والحصول على تجربة أفضل لزبائنك.
            </p>
          </div>

          {/* أزرار التواصل */}
          <div className="space-y-2">
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
              onClick={openWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              تواصل عبر واتساب
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 gap-2"
              onClick={openCall}
            >
              <Phone className="h-4 w-4" />
              اتصل بنا
            </Button>
          </div>

          {/* ملاحظة */}
          <p className="text-[10px] text-muted-foreground text-center">
            سيتم الرد عليك في أقرب وقت لترتيب التفعيل والدفع
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// غلاف ميزة — يعرض الأطفال أو الحالة المقفلة
// ============================================================

interface PremiumFeatureProps {
  feature: FeatureDef;
  enabled: boolean;
  /** رقم واتساب/هاتف المالك */
  ownerPhone?: string | null;
  ownerWhatsapp?: string | null;
  shopName?: string;
  /** عرض الطفل (ممكن أن يكون أي ReactNode) */
  children?: React.ReactNode;
  /** عرض مقفل — ممكن تخصيصه */
  lockedView?: React.ReactNode;
  /** نمط العرض: "overlay" (غطاء شفاف) أو "disabled" (رمادي) أو "badge" (شارة فقط) */
  mode?: "overlay" | "disabled" | "badge";
  /** class إضافي للحاوية */
  className?: string;
}

export function PremiumFeature({
  feature,
  enabled,
  ownerPhone,
  ownerWhatsapp,
  shopName,
  children,
  lockedView,
  mode = "disabled",
  className = "",
}: PremiumFeatureProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // إذا الميزة مفعّلة — عرض الطبيعي
  if (enabled) {
    return <>{children}</>;
  }

  // إذا الميزة مقفلة
  return (
    <>
      <div className={`relative ${className}`}>
        {/* المحتوى الأصلي (مخفّض أو مرئي حسب النمط) */}
        {mode === "badge" ? (
          // نمط الشارة: كل شيء يعمل لكن مع شارة PRO
          <div className="flex items-center gap-2">
            {children}
            <button
              onClick={() => setDialogOpen(true)}
              className="shrink-0"
              aria-label={`تفعيل ${feature.label}`}
            >
              <PremiumBadge />
            </button>
          </div>
        ) : mode === "overlay" ? (
          // نمط الغطاء: المحتوى مرئي لكن عليه غطاء + زر
          <div className="relative">
            <div className="pointer-events-none opacity-40 select-none">
              {children}
            </div>
            {/* الغطاء */}
            <div
              className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl
                flex flex-col items-center justify-center gap-2 cursor-pointer
                hover:bg-white/70 transition-colors"
              onClick={() => setDialogOpen(true)}
            >
              {lockedView || (
                <div className="text-center p-4">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-2">
                    <Lock className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">{feature.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <PremiumBadge size="md" /> نسخة مدفوعة
                  </p>
                  <p className="text-[10px] text-amber-600 mt-2 font-medium">
                    اضغط لتفعيلها
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // نمط معطّل: مكون رمادي غير قابل للنقر
          <>
            {lockedView || (
              <div
                className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-4
                  cursor-pointer hover:border-amber-300 hover:bg-amber-50/60 transition-all
                  flex items-center gap-3"
                onClick={() => setDialogOpen(true)}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">{feature.label}</span>
                    <PremiumBadge />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{feature.description}</p>
                </div>
                <span className="text-[10px] text-amber-600 font-medium shrink-0">اضغط</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* نافذة التواصل */}
      <PremiumLockDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        feature={feature}
        ownerPhone={ownerPhone}
        ownerWhatsapp={ownerWhatsapp}
        shopName={shopName}
      />
    </>
  );
}

// ============================================================
// بانر "ميزة مقفلة" الجاهز — للأسطر المختصرة
// ============================================================

interface PremiumInlineProps {
  feature: FeatureDef;
  ownerPhone?: string | null;
  ownerWhatsapp?: string | null;
  shopName?: string;
}

export function PremiumInline({
  feature,
  ownerPhone,
  ownerWhatsapp,
  shopName,
}: PremiumInlineProps) {
  return (
    <PremiumFeature
      feature={feature}
      enabled={false}
      ownerPhone={ownerPhone}
      ownerWhatsapp={ownerWhatsapp}
      shopName={shopName}
    >
      <div />
    </PremiumFeature>
  );
}