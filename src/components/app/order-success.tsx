"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Copy,
  Download,
  QrCode,
  Phone,
  Clock,
  Package,
  RefreshCw,
  Search,
  Plus,
  Loader2,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { downloadInvoicePDF } from "@/lib/pdf-invoice";
import type { CreatedOrder } from "@/components/app/app-shell";
import {
  STATUS_FLOW,
  STATUS_META,
  formatDA,
} from "@/lib/print-config";

interface OrderSuccessProps {
  order: CreatedOrder | null;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: "new" | "track" | "repeat") => void;
}

export function OrderSuccess({ order, open, onClose, onNavigate }: OrderSuccessProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQR, setShowQR] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (order && open) {
      // توليد QR يحتوي على معلومات الطلب
      const qrPayload = JSON.stringify({
        ref: order.reference,
        service: order.serviceName,
        total: order.total,
        status: order.status,
        ts: Date.now(),
      });
      let active = true;
      QRCode.toDataURL(qrPayload, {
        width: 280,
        margin: 1,
        color: { dark: "#1a1a1a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then((url) => {
          if (active) {
            setQrDataUrl(url);
            setShowQR(false);
          }
        })
        .catch(() => {
          if (active) setQrDataUrl("");
        });
      return () => {
        active = false;
      };
    }
  }, [order, open]);

  if (!order) return null;

  function copyRef() {
    if (!order) return;
    navigator.clipboard.writeText(order.reference);
    toast.success("تم نسخ رقم الطلب");
  }

  async function downloadInvoice() {
    if (!order) return;
    setPdfLoading(true);
    await downloadInvoicePDF(order.id, order.reference);
    setPdfLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[94vh] flex flex-col" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">تم استلام الطلب</DialogTitle>
        <div className="overflow-y-auto custom-scroll">
          {/* ===== رأس النجاح ===== */}
          <div className="bg-gradient-to-b from-emerald-50 to-white p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4 ring-4 ring-emerald-50">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم استلام طلبك بنجاح</h2>
            <p className="text-sm text-muted-foreground">
              طلبك الآن في النظام — سنتواصل معك قريباً لتأكيد التفاصيل
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* ===== رقم المعاملة + السعر ===== */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground mb-1">رقم المعاملة</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold text-neutral-900 font-mono tracking-wider">
                    {order.reference}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyRef}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground mb-1">السعر التقديري</div>
                <div className="text-xl font-bold text-amber-700">{formatDA(order.total)}</div>
              </div>
            </div>

            {/* ===== QR + الفاتورة ===== */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowQR(!showQR)}
                className="group flex items-center gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors text-right"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
                  <QrCode className="h-5 w-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm">رمز QR للعملية</div>
                  <div className="text-xs text-muted-foreground">
                    {showQR ? "إخفاء الرمز" : "اعرض الرمز للمسح"}
                  </div>
                </div>
              </button>
              <button
                onClick={downloadInvoice}
                disabled={pdfLoading}
                className="group flex items-center gap-3 p-4 rounded-xl border-2 border-neutral-200 bg-card hover:bg-neutral-50 hover:border-neutral-300 transition-colors text-right disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                  {pdfLoading ? (
                    <Loader2 className="h-5 w-5 text-neutral-900 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 text-neutral-900" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm">{pdfLoading ? "جارٍ الإنشاء..." : "تنزيل الفاتورة PDF"}</div>
                  <div className="text-xs text-muted-foreground">ملف PDF جاهز للطباعة</div>
                </div>
              </button>
            </div>

            {/* ===== عرض QR ===== */}
            {showQR && qrDataUrl && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-center animate-in fade-in zoom-in duration-300">
                <div className="inline-block bg-white p-3 rounded-xl shadow-sm">
                  
                  <img src={qrDataUrl} alt={`QR ${order.reference}`} className="w-48 h-48 mx-auto" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  اعرض هذا الرمز في المطبعة لاستلام طلبك بسرعة
                </p>
                <p className="text-xs font-mono font-bold text-neutral-900 mt-1">{order.reference}</p>
              </div>
            )}

            {/* ===== الوقت المتوقع للتسليم ===== */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">الوقت المتوقع للتسليم</div>
                <div className="font-bold text-blue-700">
                  {order.estimatedHours} {order.estimatedHours === 1 ? "ساعة" : "ساعة"}
                </div>
              </div>
              <div className="text-xs text-blue-600 text-left">
                سيصلك إشعار<br />عند الجاهزية
              </div>
            </div>

            {/* ===== ملاحظة المكالمة ===== */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-amber-600" />
                <span className="font-bold text-sm">سنتواصل معك قبل بدء الطباعة</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                سنتصل بك على الرقم المُدخل لتأكيد الطلب والتفاصيل النهائية قبل تنفيذ الطباعة.
                تأكد من توفّرك لاستقبال المكالمة.
              </p>
            </div>

            {/* ===== مراحل تنفيذ الطلب ===== */}
            <div>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                مراحل تنفيذ الطلب
              </h3>
              <div className="space-y-0">
                {STATUS_FLOW.map((s, i) => {
                  const meta = STATUS_META[s];
                  const isCurrent = s === order.status;
                  const isDone = STATUS_FLOW.indexOf(order.status) > i;
                  return (
                    <div key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all ${
                            isCurrent
                              ? "bg-amber-400 border-amber-400 scale-110 shadow-md"
                              : isDone
                                ? "bg-emerald-400 border-emerald-400"
                                : "bg-card border-muted"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : (
                            <span>{meta.emoji}</span>
                          )}
                        </div>
                        {i < STATUS_FLOW.length - 1 && (
                          <div className={`w-0.5 h-8 ${isDone ? "bg-emerald-400" : "bg-muted"}`} />
                        )}
                      </div>
                      <div className="pt-1.5 pb-8">
                        <div className={`font-semibold text-sm ${isCurrent ? "text-amber-700" : isDone ? "text-emerald-700" : "text-muted-foreground"}`}>
                          {meta.label}
                          {isCurrent && (
                            <span className="mr-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              الحالة الحالية
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== أزرار الإجراءات ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onClose();
                  onNavigate("repeat");
                }}
              >
                <RefreshCw className="h-4 w-4" />
                إعادة طلب
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onClose();
                  onNavigate("track");
                }}
              >
                <Search className="h-4 w-4" />
                تتبّع الطلب
              </Button>
              <Button
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
                onClick={() => {
                  onClose();
                  onNavigate("new");
                }}
              >
                <Plus className="h-4 w-4" />
                طلب جديد
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
