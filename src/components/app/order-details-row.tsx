"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronLeft, Download, FileText, Phone, MapPin, Clock, User, Package, RotateCcw } from "lucide-react";
import { TableCell } from "@/components/ui/table";
import {
  STATUS_META,
  formatDA,
  formatDateTimeAr,
} from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_FLOW } from "@/lib/print-config";

interface OrderDetailsRowProps {
  order: PrintOrderLite;
  onStatusChange?: (order: PrintOrderLite, status: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function OrderDetailsRow({ order, onStatusChange, selected, onToggleSelect }: OrderDetailsRowProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status];

  const serviceEmoji: Record<string, string> = {
    document: "🖨️",
    photo: "🖼️",
    binding: "📚",
    copy: "📄",
    card: "🪪",
    poster: "📜",
  };

  function handleDownloadFile() {
    // تنزيل بيانات الطلب كملف نصي (لأن الملف الأصلي لا يُرفع للخادم)
    const orderData = `تفاصيل الطلب
================================
رقم الطلب: ${order.reference}
التاريخ: ${formatDateTimeAr(order.createdAt)}
الحالة: ${meta.label}

الخدمة: ${order.serviceName}
الملف: ${order.fileName || "بدون ملف"}
نوع الملف: ${order.fileType || "—"}
حجم الملف: ${order.fileSize ? Math.round(order.fileSize / 1024) + " ك.ب" : "—"}

مواصفات الطباعة:
${Object.entries(order.options)
  .filter(([k]) => !["notes", "printRange", "pageRange", "totalPages"].includes(k))
  .map(([k, v]) => `  - ${k}: ${v}`)
  .join("\n")}
${order.options.printRange === "custom" ? `  - نطاق الطباعة: صفحات ${order.options.pageRange}` : "  - نطاق الطباعة: الملف كامل"}
  - إجمالي الصفحات: ${order.options.totalPages || order.pages}
  - الصفحات المطبوعة: ${order.pages}
  - عدد النسخ: ${order.copies}

العميل:
  - الاسم: ${order.customer.name}
  - الهاتف: ${order.customer.phone}
  ${order.customer.whatsapp ? `- واتساب: ${order.customer.whatsapp}` : ""}
  ${order.customer.email ? `- البريد: ${order.customer.email}` : ""}
  - طريقة الاستلام: ${order.customer.deliveryMethod === "delivery" ? "توصيل" : "استلام من المطبعة"}
  ${order.customer.address ? `- العنوان: ${order.customer.address}` : ""}
  ${order.options.notes ? `\nملاحظات: ${order.options.notes}` : ""}

التسليم:
  - الوقت: ${order.delivery.mode}
  ${order.delivery.date ? `- التاريخ: ${order.delivery.date}` : ""}
  - الوقت المتوقع: ${order.estimatedHours} ساعة

الأسعار:
  - سعر الصفحة: ${order.pricing.perPage} دج
  - تكلفة الصفحات: ${order.pricing.pagesCost} دج
  - تكلفة النسخ: ${order.pricing.copiesCost} دج
  ${order.pricing.finishingCost ? (order.pricing.finishingCost > 0 ? `- التشطيب: ${order.pricing.finishingCost} دج` : "") : ""}
  ${order.pricing.deliveryCost > 0 ? `- التوصيل: ${order.pricing.deliveryCost} دج` : ""}
  ${order.pricing.discount > 0 ? `- الخصم: -${order.pricing.discount} دج` : ""}
  - المجموع: ${order.pricing.total} دج

================================
`;

    const blob = new Blob([orderData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-${order.reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownloadInvoice() {
    window.open(`/api/orders/${order.id}/invoice`, "_blank");
  }

  // تجميع خيارات الطباعة للعرض
  const printOptions = Object.entries(order.options)
    .filter(([k, v]) => v !== undefined && v !== null && v !== "" && !["notes", "printRange", "pageRange", "totalPages"].includes(k))
    .map(([k, v]) => ({ key: k, value: String(v) }));

  const optionLabels: Record<string, string> = {
    pages: "الصفحات",
    copies: "النسخ",
    color: "نوع الطباعة",
    paperSize: "حجم الورق",
    sides: "الوجهين",
    binding: "التجليد",
    paperType: "نوع الورق",
    photoSize: "حجم الصورة",
    finish: "التشطيب",
    retouch: "تحسينات",
    bindingType: "نوع التجليد",
    coverColor: "لون الغلاف",
    coverPrint: "طباعة الغلاف",
    cardType: "نوع البطاقة",
    lamination: "التغليف",
    posterSize: "حجم الملصق",
    material: "الخامة",
    sorting: "الترتيب",
    extras: "إضافات",
  };

  const colorLabels: Record<string, string> = { bw: "أبيض وأسود", color: "ملون" };
  const sidesLabels: Record<string, string> = { single: "وجه واحد", double: "وجهان" };
  const bindingLabels: Record<string, string> = { none: "بدون", staple: "تدبيس", spiral: "لولبي", glue: "غراء" };
  const paperTypeLabels: Record<string, string> = { normal: "عادي", glossy: "لامع", matte: "مطفي", cardboard: "مقوّى" };

  function formatOptionValue(key: string, value: string): string {
    if (key === "color") return colorLabels[value] || value;
    if (key === "sides") return sidesLabels[value] || value;
    if (key === "binding") return bindingLabels[value] || value;
    if (key === "paperType") return paperTypeLabels[value] || value;
    return value;
  }

  return (
    <>
      <TableRow
        order={order}
        meta={meta}
        serviceEmoji={serviceEmoji[order.serviceType] || "🖨️"}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
      {expanded && (
        <tr className="bg-amber-50/40">
          <td colSpan={onToggleSelect ? 10 : 9} className="p-0">
            <div className="p-4 md:p-6 border-t border-amber-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ===== مواصفات الطباعة ===== */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-600" />
                      متطلبات الطباعة المطلوبة من الزبون
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {printOptions.map(({ key, value }) => (
                        <div key={key} className="rounded-lg bg-white border border-amber-100 p-2.5">
                          <div className="text-xs text-muted-foreground">{optionLabels[key] || key}</div>
                          <div className="text-xs font-semibold text-neutral-900 mt-0.5">
                            {formatOptionValue(key, value)}
                          </div>
                        </div>
                      ))}
                      {order.options.printRange === "custom" && (
                        <div className="rounded-lg bg-amber-100 border border-amber-300 p-2.5">
                          <div className="text-xs text-amber-700">نطاق الطباعة</div>
                          <div className="text-xs font-semibold text-amber-900 mt-0.5">
                            صفحات: {order.options.pageRange}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* معلومات الملف */}
                  {order.fileName && (
                    <div>
                      <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        ملف الزبون
                      </h4>
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-amber-100 p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{order.fileName}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.fileType} {order.fileSize ? `· ${Math.round(order.fileSize / 1024)} ك.ب` : ""}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleDownloadFile} className="shrink-0">
                          <Download className="h-4 w-4" />
                          تنزيل
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ملاحظات الزبون */}
                  {order.options.notes && (
                    <div>
                      <h4 className="font-bold text-sm mb-2">ملاحظات الزبون</h4>
                      <div className="rounded-lg bg-white border border-amber-100 p-3 text-sm text-neutral-700 whitespace-pre-wrap">
                        {order.options.notes}
                      </div>
                    </div>
                  )}

                  {/* الأسعار التفصيلية */}
                  <div>
                    <h4 className="font-bold text-sm mb-2">تفاصيل التسعير</h4>
                    <div className="rounded-lg bg-white border border-amber-100 p-3 space-y-1.5 text-xs">
                      <PriceRow label="سعر الصفحة" value={order.pricing.perPage} />
                      <PriceRow label="تكلفة الصفحات" value={order.pricing.pagesCost} />
                      <PriceRow label="تكلفة النسخ" value={order.pricing.copiesCost} />
                      {(order.pricing.finishingCost ?? 0) > 0 && (
                        <PriceRow label="التشطيب/التجليد" value={order.pricing.finishingCost!} />
                      )}
                      {order.pricing.deliveryCost > 0 && (
                        <PriceRow label="التوصيل العاجل" value={order.pricing.deliveryCost} />
                      )}
                      {order.pricing.discount > 0 && (
                        <PriceRow label="خصم الكمية" value={-order.pricing.discount} green />
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                        <span className="font-bold">المجموع</span>
                        <span className="font-bold text-amber-700 text-base">{formatDA(order.pricing.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== معلومات العميل والتسليم ===== */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-amber-600" />
                      معلومات العميل
                    </h4>
                    <div className="rounded-lg bg-white border border-amber-100 p-3 space-y-2 text-xs">
                      <InfoRow icon={<User className="h-3.5 w-3.5" />} label="الاسم" value={order.customer.name} />
                      <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="الهاتف" value={order.customer.phone} ltr />
                      {order.customer.whatsapp && (
                        <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="واتساب" value={order.customer.whatsapp} ltr />
                      )}
                      {order.customer.email && (
                        <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="البريد" value={order.customer.email} ltr />
                      )}
                      <InfoRow
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="الاستلام"
                        value={order.customer.deliveryMethod === "delivery" ? "توصيل للعنوان" : "من المطبعة"}
                      />
                      {order.customer.address && (
                        <div className="pt-1 border-t border-amber-50">
                          <div className="text-muted-foreground mb-0.5">العنوان</div>
                          <div className="text-neutral-700 whitespace-pre-wrap">{order.customer.address}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      التسليم
                    </h4>
                    <div className="rounded-lg bg-white border border-amber-100 p-3 space-y-1.5 text-xs">
                      <InfoRow label="الوقت" value={deliveryLabel(order.delivery.mode)} />
                      {order.delivery.date && <InfoRow label="التاريخ" value={order.delivery.date} />}
                      <InfoRow label="الوقت المتوقع" value={`${order.estimatedHours} ساعة`} />
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="space-y-2">
                    {/* زر تغيير الحالة */}
                    {onStatusChange && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">
                            <RotateCcw className="h-4 w-4" />
                            تغيير الحالة
                            <ChevronDown className="h-3 w-3 mr-auto" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">الحالة الحالية: {meta.label}</div>
                          {STATUS_FLOW.filter((s) => s !== order.status).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => onStatusChange(order, s)}>
                              <span className="mr-2">{STATUS_META[s].emoji}</span>
                              {STATUS_META[s].label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => onStatusChange(order, "cancelled")} className="text-rose-600">
                            <span className="mr-2">❌</span>
                            إلغاء الطلب
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button size="sm" variant="outline" className="w-full" onClick={handleDownloadInvoice}>
                      <Download className="h-4 w-4" />
                      تنزيل الفاتورة PDF
                    </Button>
                    {order.fileName && (
                      <Button size="sm" variant="outline" className="w-full" onClick={handleDownloadFile}>
                        <Download className="h-4 w-4" />
                        تنزيل تفاصيل الطلب
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function deliveryLabel(mode: string): string {
  const labels: Record<string, string> = {
    hour: "خلال ساعة ⚡",
    today: "اليوم",
    tomorrow: "غداً",
    scheduled: "تاريخ محدد",
  };
  return labels[mode] || mode;
}

function TableRow({
  order,
  meta,
  serviceEmoji,
  expanded,
  onToggle,
  selected,
  onToggleSelect,
}: {
  order: PrintOrderLite;
  meta: { label: string; bg: string };
  serviceEmoji: string;
  expanded: boolean;
  onToggle: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <TableRowInner
      order={order}
      meta={meta}
      serviceEmoji={serviceEmoji}
      expanded={expanded}
      onToggle={onToggle}
      selected={selected}
      onToggleSelect={onToggleSelect}
    />
  );
}

function TableRowInner({
  order,
  meta,
  serviceEmoji,
  expanded,
  onToggle,
  selected,
  onToggleSelect,
}: {
  order: PrintOrderLite;
  meta: { label: string; bg: string };
  serviceEmoji: string;
  expanded: boolean;
  onToggle: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <tr
      className={`hover:bg-amber-50/30 cursor-pointer transition-colors ${expanded ? "bg-amber-50/50" : ""} ${selected ? "bg-amber-50/60" : ""}`}
      onClick={onToggle}
    >
      {onToggleSelect && (
        <td className="p-2 w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`تحديد ${order.reference}`} />
        </td>
      )}
      <TableCell className="font-mono text-xs whitespace-nowrap">{order.reference}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-lg">{serviceEmoji}</span>
          <span className="text-xs hidden sm:inline">{order.serviceName}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm">{order.customer.name}</TableCell>
      <TableCell className="text-xs font-mono hidden md:table-cell" dir="ltr">{order.customer.phone}</TableCell>
      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
        {order.pages}ص × {order.copies}ن
      </TableCell>
      <TableCell className="text-sm font-bold text-amber-700 whitespace-nowrap">{formatDA(order.total)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${meta.bg}`}>
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
        {formatDateTimeAr(order.createdAt)}
      </TableCell>
      <TableCell className="text-center">
        <div className={`inline-flex transition-transform ${expanded ? "rotate-90" : ""}`}>
          <ChevronLeft className="h-4 w-4 text-amber-600" />
        </div>
      </TableCell>
    </tr>
  );
}

function PriceRow({ label, value, green }: { label: string; value: number; green?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={green ? "text-emerald-600 font-medium" : "font-medium"}>
        {value > 0 ? formatDA(value) : value < 0 ? `−${formatDA(Math.abs(value))}` : "مجاني"}
      </span>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-medium" dir={ltr ? "ltr" : "rtl"}>
        {value}
      </span>
    </div>
  );
}
