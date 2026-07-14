"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Inbox, Search, RotateCcw, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_META,
  formatDA,
  formatDateTimeAr,
} from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";

interface RepeatOrderProps {
  /** عند اختيار طلب لإعادة تعبئته في المعالج */
  onRepeat: (order: PrintOrderLite) => void;
  shopId?: string | null;
}

export function RepeatOrder({ onRepeat, shopId }: RepeatOrderProps) {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<PrintOrderLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = phone.replace(/[\s\-+]/g, "");
    if (clean.length < 8) {
      toast.error("رقم الهاتف غير صحيح", {
        description: "أدخل رقماً جزائرياً صحيحاً (8 أرقام على الأقل)",
      });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/orders/by-phone?phone=${encodeURIComponent(clean)}${shopId ? `&shopId=${shopId}` : ""}`);
      const d = await res.json();
      setOrders(d.orders || []);
      if ((d.orders || []).length === 0) {
        toast.info("لا توجد طلبات سابقة لهذا الرقم");
      } else {
        toast.success(`تم العثور على ${d.orders.length} طلب سابق`);
      }
    } catch {
      setOrders([]);
      toast.error("خطأ في البحث");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
          <RotateCcw className="h-7 w-7 text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold mb-1">إعادة طلب سابق</h1>
        <p className="text-sm text-muted-foreground">
          أدخل رقم هاتفك لعرض كل طلباتك السابقة — اختر أحدها وعدّله قبل التأكيد
        </p>
      </div>

      {/* البحث برقم الهاتف */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05XX XX XX XX"
            className="pr-9 h-12 text-base"
            dir="ltr"
            type="tel"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6 bg-neutral-900 hover:bg-neutral-800 text-white" disabled={loading}>
          {loading ? (
            <span className="animate-pulse">بحث...</span>
          ) : (
            <>
              <Search className="h-4 w-4" />
              عرض طلباتي
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground mb-6">
        🔒 يُستخدم رقم هاتفك فقط لاسترجاع طلباتك السابقة — تُحذف تلقائياً بعد 10 أيام
      </p>

      {/* النتائج */}
      {searched && !loading && orders.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">لا توجد طلبات سابقة لهذا الرقم</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              تأكد من الرقم أو ابدأ طلبك الأول
            </p>
            <p className="text-xs text-muted-foreground">
              ملاحظة: تُحذف الطلبات تلقائياً بعد 10 أيام من تاريخ إنشائها
            </p>
          </CardContent>
        </Card>
      )}

      {orders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">
              {orders.length === 1 ? "طلب سابق" : "طلبات سابقة"}
            </h2>
            <span className="text-xs text-muted-foreground">اختر طلباً لتعديله وإرساله من جديد</span>
          </div>
          <div className="space-y-3">
            {orders.map((o) => (
              <RepeatOrderCard key={o.id} order={o} onRepeat={onRepeat} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RepeatOrderCard({
  order,
  onRepeat,
}: {
  order: PrintOrderLite;
  onRepeat: (o: PrintOrderLite) => void;
}) {
  const meta = STATUS_META[order.status];
  const serviceEmoji: Record<string, string> = {
    document: "🖨️",
    photo: "🖼️",
    binding: "📚",
    copy: "📄",
    card: "🪪",
    poster: "📜",
  };

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
            <span className="text-xl">{serviceEmoji[order.serviceType] || "🖨️"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-sm">{order.serviceName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg}`}>
                {meta.label}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <span className="font-mono">{order.reference}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTimeAr(order.createdAt)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
              <span>{order.pages} صفحة · {order.copies} نسخة</span>
              {order.fileName && (
                <span className="flex items-center gap-1 truncate max-w-[150px]">
                  <FileText className="h-3 w-3" />
                  {order.fileName}
                </span>
              )}
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="text-xs text-muted-foreground">المجموع</div>
            <div className="font-bold text-amber-700">{formatDA(order.total)}</div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-neutral-900 hover:bg-neutral-800 text-white"
            onClick={() => {
              onRepeat(order);
              toast.success("تم تحميل الطلب للتعديل", {
                description: "عدّل ما تريد ثم أكّد الطلب الجديد",
              });
            }}
          >
            <RotateCcw className="h-4 w-4" />
            تعديل وإعادة
          </Button>
        </div>
        {/* تفاصيل سريعة */}
        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <Detail label="الطباعة" value={order.options.color === "color" ? "ملون" : "أبيض وأسود"} />
          <Detail label="الورق" value={`${order.options.paperSize} · ${order.options.paperType}`} />
          <Detail label="التجليد" value={order.options.binding === "none" ? "بدون" : order.options.binding} />
          <Detail label="النسخ" value={`${order.copies}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/40 px-2 py-1">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
