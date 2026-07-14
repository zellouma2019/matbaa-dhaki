"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Send,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import type { FormTemplateT, FormRecordT, RecordStatus, RecordPriority, FormField } from "@/lib/types";

interface FormFillerProps {
  template: FormTemplateT;
  record?: FormRecordT | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onPrint?: (record: FormRecordT) => void;
}

export function FormFiller({
  template,
  record,
  open,
  onOpenChange,
  onSaved,
  onPrint,
}: FormFillerProps) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [applicantName, setApplicantName] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<RecordStatus>("draft");
  const [priority, setPriority] = useState<RecordPriority>("normal");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      if (record) {
        setData(record.data || {});
        setApplicantName(record.applicantName || "");
        setSubject(record.subject || "");
        setStatus(record.status);
        setPriority(record.priority);
        setNotes(record.notes || "");
      } else {
        setData({});
        setApplicantName("");
        setSubject("");
        setStatus("draft");
        setPriority("normal");
        setNotes("");
      }
      setErrors({});
    }
  }, [open, record]);

  function setField(key: string, value: unknown) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  }

  function validate(): boolean {
    const errs: Record<string, boolean> = {};
    let hasError = false;
    template.schema.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (f.required) {
          const v = data[f.key];
          const empty =
            v === undefined ||
            v === null ||
            v === "" ||
            (Array.isArray(v) && v.length === 0);
          if (empty) {
            errs[f.key] = true;
            hasError = true;
          }
        }
      });
    });
    if (!applicantName.trim()) {
      hasError = true;
    }
    setErrors(errs);
    return !hasError;
  }

  async function handleSave(saveStatus: RecordStatus) {
    if (saveStatus !== "draft" && !validate()) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة قبل التقديم", {
        description: "الحقول المطلوبة معلّمة بعلامة *",
      });
      return;
    }

    setSaving(true);
    try {
      const url = record
        ? `/api/records/${record.id}`
        : `/api/records`;
      const method = record ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          applicantName,
          subject,
          status: saveStatus,
          priority,
          data,
          notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل الحفظ");
      }
      const saved = await res.json();
      toast.success(
        saveStatus === "submitted"
          ? "تم تقديم الطلب بنجاح"
          : "تم حفظ المسودة بنجاح",
        {
          description: `الرقم المرجعي: ${saved.reference}`,
        },
      );
      onSaved();
      onOpenChange(false);
      if (saveStatus === "submitted" && onPrint) {
        onPrint(saved);
      }
    } catch (e) {
      toast.error("خطأ في الحفظ", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const filledCount = template.schema.sections.reduce(
    (acc, sec) =>
      acc +
      sec.fields.filter((f) => {
        const v = data[f.key];
        return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
      }).length,
    0,
  );
  const totalCount = template.schema.sections.reduce(
    (acc, sec) => acc + sec.fields.length,
    0,
  );
  const progress = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[92vh] max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b bg-primary/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                {template.code.replace("نموذج", "ن")}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {template.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {template.code} · {template.category}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="no-print"
              >
                <X className="h-4 w-4" />
                إغلاق
              </Button>
            </div>
          </div>

          {/* شريط التقدم */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filledCount} / {totalCount} حقل · {progress}%
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll px-6 py-5">
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* الملخص */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/40 border">
              <div>
                <Label className="text-xs text-muted-foreground">اسم مقدم الطلب *</Label>
                <Input
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">موضوع الطلب *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="عنوان موجز"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">الأولوية</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as RecordPriority)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="normal">عادية</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">الحالة</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as RecordStatus)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="submitted">مُقدّم</SelectItem>
                      <SelectItem value="under_review">قيد المراجعة</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* الأقسام */}
            {template.schema.sections.map((section, idx) => (
              <div key={idx} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-primary/5 border-b flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{section.title}</h3>
                    {section.description && (
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((field) => (
                      <FieldRenderer
                        key={field.key}
                        field={field}
                        value={data[field.key]}
                        error={errors[field.key]}
                        onChange={(v) => setField(field.key, v)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* الاعتمادات - عرض فقط */}
            {template.schema.approvals && template.schema.approvals.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-primary/5 border-b">
                  <h3 className="font-bold text-sm">الاعتمادات والتوقيعات</h3>
                  <p className="text-xs text-muted-foreground">جهات الاعتماد المطلوبة على النموذج</p>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {template.schema.approvals.map((a, i) => (
                    <div key={i} className="approval-cell rounded-lg border p-3 text-center bg-muted/20">
                      <div className="text-xs text-muted-foreground mb-1">{a.label}</div>
                      <div className="h-12 border-b border-dashed border-muted-foreground/30 mb-1" />
                      <div className="text-[10px] text-muted-foreground">
                        {a.description || "الاسم / التوقيع / التاريخ"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ملاحظات */}
            <div className="rounded-xl border bg-card p-4">
              <Label className="text-sm font-medium">ملاحظات إضافية</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between gap-2 no-print">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            الحقول المطلوبة معلّمة بـ *
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              حفظ كمسودة
            </Button>
            <Button
              onClick={() => handleSave(status === "draft" ? "submitted" : status)}
              disabled={saving}
            >
              {saving ? (
                <span className="animate-pulse">جارٍ الحفظ...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  حفظ وتقديم
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error?: boolean;
  onChange: (v: unknown) => void;
}) {
  const colSpan =
    field.width === "full"
      ? "md:col-span-2"
      : field.width === "third"
        ? "md:col-span-1"
        : "md:col-span-1";

  if (field.type === "divider") {
    return <div className={`md:col-span-2 ${colSpan}`}><Separator /></div>;
  }

  if (field.type === "info") {
    return (
      <div className={`md:col-span-2 ${colSpan} p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground`}>
        {field.label}
      </div>
    );
  }

  if (field.type === "checkbox" && field.options) {
    return (
      <div className={`md:col-span-2 ${colSpan}`}>
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive mr-1">*</span>}
        </Label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {field.options.map((opt) => {
            const arr = (value as string[]) || [];
            const checked = arr.includes(opt);
            return (
              <div
                key={opt}
                className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                  checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  const next = checked
                    ? arr.filter((x) => x !== opt)
                    : [...arr, opt];
                  onChange(next);
                }}
              >
                <Checkbox checked={checked} className="pointer-events-none" />
                <span className="text-sm">{opt}</span>
              </div>
            );
          })}
        </div>
        {error && <p className="text-xs text-destructive mt-1">هذا الحقل مطلوب</p>}
      </div>
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div className={`${colSpan}`}>
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive mr-1">*</span>}
        </Label>
        <RadioGroup
          value={(value as string) || ""}
          onValueChange={onChange}
          className="mt-2 flex flex-wrap gap-3"
        >
          {field.options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${field.key}-${opt}`} />
              <Label htmlFor={`${field.key}-${opt}`} className="text-sm font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (field.type === "signature") {
    return (
      <div className={`${colSpan}`}>
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive mr-1">*</span>}
        </Label>
        <div className="mt-2 h-16 rounded-md border border-dashed border-muted-foreground/40 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
          مساحة التوقيع
        </div>
      </div>
    );
  }

  return (
    <div className={`${colSpan}`}>
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`mt-1.5 resize-y ${error ? "border-destructive" : ""}`}
        />
      ) : field.type === "select" ? (
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger className={`mt-1.5 ${error ? "border-destructive" : ""}`}>
            <SelectValue placeholder={field.placeholder || "اختر..."} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "email"
                  ? "email"
                  : field.type === "tel" || field.type === "phone"
                    ? "tel"
                    : "text"
          }
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`mt-1.5 ${error ? "border-destructive" : ""}`}
        />
      )}
      {error && <p className="text-xs text-destructive mt-1">هذا الحقل مطلوب</p>}
      {field.info && <p className="text-xs text-muted-foreground mt-1">{field.info}</p>}
    </div>
  );
}
