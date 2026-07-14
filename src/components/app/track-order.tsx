"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, Inbox, QrCode, Download, Clock } from "lucide-react";
import QRCode from "qrcode";
import { useState as useReactState } from "react";
import {
  STATUS_META,
  STATUS_FLOW,
  formatDA,
  formatDateAr,
  formatDateTimeAr,
} from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";

export function TrackOrder({ shopId, initialQuery }: { shopId?: string | null; initialQuery?: string | null }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [orders, setOrders] = useState<PrintOrderLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // البحث التلقائي عند وجود initialQuery
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (initialQuery?.trim() && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      const q = initialQuery.trim();
      setLoading(true);
      setSearched(true);
      fetch(`/api/track?q=${encodeURIComponent(q)}${shopId ? `&shopId=${shopId}` : ""}`)
        .then((r) => r.json())
        .then((d) => setOrders(d.orders || []))
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    }
  }, [initialQuery, shopId]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(query.trim())}${shopId ? `&shopId=${shopId}` : ""}`);
      const d = await res.json();
      setOrders(d.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
          <Package className="h-7 w-7 text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold mb-1">تتبّع طلبك</h1>
        <p className="text-sm text-muted-foreground">
          أدخل رقم الطلب أو رقم هاتفك لمعرفة حالة طلبك
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="مثال: A-1050 أو 0560..."
            className="pr-9 h-12 text-base"
            dir="ltr"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6 bg-neutral-900 hover:bg-neutral-800 text-white">
          تتبّع
        </Button>
      </form>

      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          جارٍ البحث...
        </div>
      )}

      {!loading && searched && orders.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">لا توجد طلبات مطابقة</p>
            <p className="text-xs text-muted-foreground mt-1">
              تأكد من رقم الطلب أو رقم الهاتف وحاول مرة أخرى
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderTrackingCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderTrackingCard({ order }: { order: PrintOrderLite }) {
  const meta = STATUS_META[order.status];
  const currentStep = meta.step;
  const customer = order.customer;
  const delivery = order.delivery;
  const DELIVERY_LABELS: Record<string, string> = {
    hour: "خلال ساعة",
    today: "اليوم",
    tomorrow: "غداً",
    scheduled: formatDateAr(delivery.date),
  };
  const [qrUrl, setQrUrl] = useReactState("");

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({ ref: order.reference, total: order.total, ts: Date.now() }),
      { width: 160, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" } },
    ).then(setQrUrl).catch(() => {});
  }, [order.reference, order.total]);

  function downloadInvoice() {
    window.open(`/api/orders/${order.id}/invoice`, "_blank");
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* الرأس */}
        <div className="px-5 py-4 border-b flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
              <Package className="h-5 w-5 text-neutral-900" />
            </div>
            <div>
              <div className="font-mono font-bold text-sm text-amber-400">{order.reference}</div>
              <div className="text-xs text-neutral-300">
                {order.serviceName} · {formatDateTimeAr(order.createdAt)}
              </div>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${meta.bg}`}>
            {meta.label}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* خط الزمن */}
          <div className="flex items-center justify-between mb-2">
            {STATUS_FLOW.map((s, i) => {
              const done = i < currentStep - 1;
              const active = i === currentStep - 1;
              const m = STATUS_META[s];
              return (
                <div key={s} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <div
                      className={`absolute right-1/2 top-3 w-full h-0.5 ${
                        done ? "bg-emerald-400" : "bg-muted"
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 ${
                      done
                        ? "bg-emerald-400 border-emerald-400 text-white"
                        : active
                          ? "bg-amber-400 border-amber-400 text-white scale-110"
                          : "bg-card border-muted text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : m.emoji}
                  </div>
                  <div
                    className={`text-xs mt-1.5 text-center leading-tight ${
                      done || active ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* QR + الفاتورة */}
          <div className="grid grid-cols-2 gap-2">
            {qrUrl && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                
                <img src={qrUrl} alt="QR" className="w-12 h-12 rounded" />
                <div className="text-xs">
                  <div className="font-bold text-amber-800">رمز QR</div>
                  <div className="text-muted-foreground">للاستلام السريع</div>
                </div>
              </div>
            )}
            <button
              onClick={downloadInvoice}
              className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-colors text-right"
            >
              <Download className="h-5 w-5 text-neutral-700 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-neutral-800">تنزيل الفاتورة</div>
                <div className="text-muted-foreground">PDF</div>
              </div>
            </button>
          </div>

          {/* الوقت المتوقع */}
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>الوقت المتوقع للتسليم: <strong>{order.estimatedHours} {order.estimatedHours === 1 ? "ساعة" : "ساعات"}</strong></span>
          </div>

          {/* التفاصيل */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Detail label="العميل" value={customer.name} />
            <Detail label="الهاتف" value={customer.phone} />
            <Detail label="عدد الصفحات" value={`${order.pages} صفحة × ${order.copies} نسخة`} />
            <Detail label="التسليم" value={DELIVERY_LABELS[delivery.mode] || delivery.mode} />
            {order.fileName && <Detail label="الملف" value={order.fileName} />}
            <Detail label="المجموع" value={formatDA(order.total)} highlight />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium truncate ${highlight ? "text-amber-700 font-bold" : ""}`} dir="auto">
        {value}
      </div>
    </div>
  );
}
