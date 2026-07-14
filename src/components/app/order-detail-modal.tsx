"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, X, FileText, Download, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  STATUS_META,
  STATUS_FLOW,
  formatDA,
  formatDateTimeAr,
} from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";
import {
  translateOptionKey,
  translateOptionValue,
  HIDDEN_OPTION_KEYS,
} from "@/lib/option-translations";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SERVICE_EMOJI: Record<string, string> = {
  document: "🖨️",
  photo: "🖼️",
  binding: "📚",
  copy: "📄",
  card: "🪪",
  poster: "📜",
};

interface OrderDetailModalProps {
  order: PrintOrderLite | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (order: PrintOrderLite, status: string) => void;
}

export function OrderDetailModal({
  order,
  open,
  onClose,
  onStatusChange,
}: OrderDetailModalProps) {
  const adminCode = useAppStore((s) => s.adminCode);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState<{
    id: string;
    action: string;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    details: string | null;
    createdAt: string;
  }[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    if (!order) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/audit?x-admin-code=${adminCode}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      /* silent */
    } finally {
      setAuditLoading(false);
    }
  }, [order, adminCode]);

  useEffect(() => {
    if (open && order) {
      setShowAudit(false);
      setAuditLogs([]);
      fetchAuditLogs();
    }
  }, [open, order, fetchAuditLogs]);

  // حقول التعديل
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsApp, setEditWhatsApp] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCopies, setEditCopies] = useState(1);
  const [editPages, setEditPages] = useState(1);
  const [editCost, setEditCost] = useState(0);
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);

  // تعبئة الحقول عند فتح النافذة أو تغيير الطلب
  useEffect(() => {
    if (!open || !order) return;
    setEditName(order.customer?.name || "");
    setEditPhone(order.customer?.phone || "");
    setEditWhatsApp(order.customer?.whatsapp || "");
    setEditEmail(order.customer?.email || "");
    setEditAddress(order.customer?.address || "");
    setEditCopies(order.copies);
    setEditPages(order.pages);
    setEditCost(order.cost || 0);
    setEditAdminNotes(order.adminNotes || "");
    try {
      setEditTags(Array.isArray(order.tags) ? order.tags : JSON.parse(order.tags || "[]"));
    } catch {
      setEditTags([]);
    }
  }, [open, order]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onClose();
    }
  }

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { action: "edit" };

      // حقول العميل
      const customerUpdates: Record<string, string> = {};
      if (editName !== (order.customer?.name || "")) customerUpdates.name = editName;
      if (editPhone !== (order.customer?.phone || "")) customerUpdates.phone = editPhone;
      if (editWhatsApp !== (order.customer.whatsapp || "")) customerUpdates.whatsapp = editWhatsApp;
      if (editEmail !== (order.customer.email || "")) customerUpdates.email = editEmail;
      if (editAddress !== (order.customer.address || "")) customerUpdates.address = editAddress;
      if (Object.keys(customerUpdates).length > 0) payload.customer = customerUpdates;

      if (editAdminNotes !== (order.adminNotes || "")) payload.adminNotes = editAdminNotes;

      const currentTags = Array.isArray(order.tags) ? order.tags : [];
      if (JSON.stringify(editTags) !== JSON.stringify(currentTags)) payload.tags = JSON.stringify(editTags);

      if (editCost !== (order.cost || 0)) payload.cost = editCost;

      if (editCopies !== order.copies) payload.copies = editCopies;
      if (editPages !== order.pages) payload.pages = editPages;

      // لا شيء تغيّر
      if (Object.keys(payload).length <= 1) {
        toast.info("لا توجد تغييرات لحفظها");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-code": adminCode },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل التحديث");
      }

      toast.success("تم تحديث الطلب بنجاح");
      onClose();
    } catch (e) {
      toast.error("خطأ في التحديث", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function handleStatusChange(status: string) {
    if (!order) return;
    onStatusChange(order, status);
  }

  if (!order) return null;

  const meta = STATUS_META[order.status];
  const serviceEmoji = SERVICE_EMOJI[order.serviceType] || "🖨️";
  const availableStatuses = STATUS_FLOW;

  function downloadFile() {
    if (order.fileData && order.fileData.startsWith("file_")) {
      fetch(`/api/orders/${order.id}/file?x-admin-code=${adminCode}`)
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = order.fileName || "file";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
    } else if (order.fileData) {
      const a = document.createElement("a");
      a.href = order.fileData;
      a.download = order.fileName || "file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">{serviceEmoji}</span>
            <span className="font-mono">{order.reference}</span>
            <span className="text-muted-foreground font-normal text-sm">— {order.serviceName}</span>
          </DialogTitle>
          <DialogDescription>
            {formatDateTimeAr(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* شريط الحالة */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${meta.bg}`}>
              {meta.emoji} {meta.label}
            </span>
            {availableStatuses
              .filter((s) => s !== order.status)
              .map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleStatusChange(s)}
                >
                  {STATUS_META[s].label}
                </Button>
              ))}
          </div>

          {/* معلومات العميل — قابل للتعديل */}
          <section>
            <h3 className="text-sm font-bold text-neutral-700 mb-2">معلومات العميل</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الاسم</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الهاتف</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-9 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">واتساب</Label>
                <Input
                  value={editWhatsApp}
                  onChange={(e) => setEditWhatsApp(e.target.value)}
                  className="h-9 text-sm"
                  dir="ltr"
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">البريد</Label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 text-sm"
                  dir="ltr"
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">العنوان</Label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="اختياري"
                />
              </div>
            </div>
          </section>

          {/* مواصفات الطباعة — للقراءة فقط */}
          <section>
            <h3 className="text-sm font-bold text-neutral-700 mb-2">مواصفات الطباعة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(order.options)
                .filter(([k, v]) => v !== undefined && v !== null && v !== "" && !HIDDEN_OPTION_KEYS.includes(k))
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg bg-muted/50 border px-3 py-2"
                  >
                    <div className="text-xs text-muted-foreground">{translateOptionKey(k)}</div>
                    <div className="text-sm font-semibold">{translateOptionValue(String(v))}</div>
                  </div>
                ))}
            </div>
          </section>

          {/* الكميات والأسعار — قابل للتعديل */}
          <section>
            <h3 className="text-sm font-bold text-neutral-700 mb-2">الكميات والأسعار</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الصفحات</Label>
                <Input
                  type="number"
                  min={1}
                  value={editPages}
                  onChange={(e) => setEditPages(Number(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">النسخ</Label>
                <Input
                  type="number"
                  min={1}
                  value={editCopies}
                  onChange={(e) => setEditCopies(Number(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تكلفة الإنتاج (دج)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editCost}
                  onChange={(e) => setEditCost(Number(e.target.value))}
                  className="h-9 text-sm"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">المجموع (دج)</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-bold text-amber-700">
                  {formatDA(order.total)}
                </div>
              </div>
            </div>
            {/* تفاصيل التسعير */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>سعر الصفحة: {formatDA(order.pricing.perPage)}</div>
              <div>تكلفة الصفحات: {formatDA(order.pricing.pagesCost)}</div>
              <div>تكلفة النسخ: {formatDA(order.pricing.copiesCost)}</div>
              <div>توفير الوجهين: {formatDA(order.pricing.sidesSaving)}</div>
              {order.pricing.paperTypeSurcharge != null && order.pricing.paperTypeSurcharge > 0 && (
                <div>رسوم الورق: {formatDA(order.pricing.paperTypeSurcharge)}</div>
              )}
              {order.pricing.bindingCost != null && order.pricing.bindingCost > 0 && (
                <div>التجليد: {formatDA(order.pricing.bindingCost)}</div>
              )}
              {order.pricing.extrasCost != null && order.pricing.extrasCost > 0 && (
                <div>إضافات: {formatDA(order.pricing.extrasCost)}</div>
              )}
              {order.pricing.finishingCost != null && order.pricing.finishingCost > 0 && (
                <div>التشطيب: {formatDA(order.pricing.finishingCost)}</div>
              )}
              <div>التوصيل: {formatDA(order.pricing.deliveryCost)}</div>
              <div>الخصم: {formatDA(order.pricing.discount)}</div>
            </div>
          </section>

          {/* ملاحظات إدارية */}
          <section>
            <h3 className="text-sm font-bold text-neutral-700 mb-2">ملاحظات إدارية</h3>
            <Textarea
              value={editAdminNotes}
              onChange={(e) => setEditAdminNotes(e.target.value)}
              className="text-sm min-h-[60px]"
              placeholder="أضف ملاحظة..."
            />
          </section>

          {/* الوسوم */}
          <section>
            <h3 className="text-sm font-bold text-neutral-700 mb-2">الوسوم</h3>
            <div className="flex flex-wrap gap-2">
              {["عاجل", "VIP", "مرتجع", "خاص"].map((tag) => (
                <Badge
                  key={tag}
                  variant={editTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer select-none text-xs"
                  onClick={() =>
                    setEditTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                    )
                  }
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </section>

          {/* معلومات الملف */}
          {order.fileName && (
            <section>
              <h3 className="text-sm font-bold text-neutral-700 mb-2">الملف المرفق</h3>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <FileText className="h-8 w-8 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{order.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.fileType || "—"} {order.fileSize ? `• ${Math.round(order.fileSize / 1024)} ك.ب` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={downloadFile}>
                  <Download className="h-3.5 w-3.5 ml-1" />
                  تنزيل
                </Button>
              </div>
            </section>
          )}

          {/* التسليم */}
          <section>
            <h3 className="text-sm font-bold text-neutral-700 mb-2">التسليم</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/50 border px-3 py-2">
                <div className="text-xs text-muted-foreground">الطريقة</div>
                <div className="font-medium">{order.delivery.mode === "pickup" ? "استلام من المحل" : "توصيل"}</div>
              </div>
              <div className="rounded-lg bg-muted/50 border px-3 py-2">
                <div className="text-xs text-muted-foreground">الموعد</div>
                <div className="font-medium">{order.delivery.date || "—"} (≈{order.estimatedHours} س)</div>
              </div>
            </div>
          </section>

          {/* سجل التغييرات */}
          <section>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-bold text-neutral-700 w-full text-right"
              onClick={() => setShowAudit(!showAudit)}
            >
              {showAudit ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              سجل التغييرات
              {auditLogs.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground mr-1">
                  ({auditLogs.length})
                </span>
              )}
            </button>
            {showAudit && (
              <div className="mt-2">
                {auditLoading ? (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    <RefreshCw className="h-3 w-3 animate-spin inline-block ml-1" />
                    جارٍ التحميل...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    لا يوجد سجل تغييرات
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto custom-scroll space-y-1">
                    {auditLogs.map((log) => {
                      const icon = log.action === "status_change" ? "🔄" : log.action === "edit" ? "✏️" : log.action === "create" ? "➕" : log.action === "delete" ? "🗑️" : "📝";
                      const actionLabel = log.action === "status_change"
                        ? "تغيير الحالة"
                        : log.action === "edit"
                          ? "تعديل"
                          : log.action === "create"
                            ? "إنشاء"
                            : log.action === "delete"
                              ? "حذف"
                              : log.action;
                      return (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/40 border border-border/50"
                    >
                      <span className="shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-foreground">{actionLabel}</span>
                          {log.field && (
                            <span className="text-muted-foreground">— {log.field}</span>
                          )}
                        </div>
                        {log.oldValue != null && log.newValue != null && (
                          <div className="text-muted-foreground mt-0.5">
                            <span className="text-rose-500 line-through">{log.oldValue}</span>
                            <span className="mx-1">→</span>
                            <span className="text-emerald-600 font-medium">{log.newValue}</span>
                          </div>
                        )}
                        {log.details && (
                          <div className="text-muted-foreground mt-0.5">{log.details}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0">
                        {formatDateTimeAr(log.createdAt)}
                      </span>
                    </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* أزرار الحفظ */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              <X className="h-3.5 w-3.5 ml-1" />
              إغلاق
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs bg-amber-600 hover:bg-amber-700">
              <Save className="h-3.5 w-3.5 ml-1" />
              {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}