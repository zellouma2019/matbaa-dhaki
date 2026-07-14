"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText } from "lucide-react";
import type { FormRecordT, FormSchema } from "@/lib/types";
import { STATUS_META, formatDateAr } from "@/lib/types";

interface PrintViewProps {
  record: FormRecordT | null;
  schema: FormSchema | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintView({ record, schema, open, onOpenChange }: PrintViewProps) {
  if (!record || !schema) return null;

  const template = record.template;

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[94vh] max-h-[94vh] p-0 gap-0 flex flex-col overflow-hidden" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">معاينة الطباعة - {record.subject}</DialogTitle>
        {/* شريط الأدوات - لا يُطبع */}
        <div className="px-6 py-3 border-b bg-primary/5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-sm">معاينة الطباعة</h2>
              <p className="text-xs text-muted-foreground">
                {template?.name} · {record.reference}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              إغلاق
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              طباعة / حفظ PDF
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-muted/30 custom-scroll">
          <div className="p-6 md:p-10">
            {/* الوثيقة */}
            <div className="print-area official-paper mx-auto max-w-[210mm] bg-white shadow-lg rounded-sm border">
              <PrintableDocument record={record} schema={schema} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrintableDocument({
  record,
  schema,
}: {
  record: FormRecordT;
  schema: FormSchema;
}) {
  const template = record.template;
  const data = record.data || {};
  const statusMeta = STATUS_META[record.status];

  return (
    <div className="p-8 md:p-12 text-slate-800 font-amiri" dir="rtl">
      {/* الترويسة الرسمية */}
      <div className="border-b-2 border-primary pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">المملكة العربية الإلكترونية</div>
            <div className="font-bold text-base text-primary">
              {data.ministry as string || "الجهة الحكومية"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {data.department as string || "الإدارة العامة"}
            </div>
          </div>
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-full border-2 border-primary flex flex-col items-center justify-center bg-primary/5">
              <div className="text-[9px] text-muted-foreground">نموذج رقم</div>
              <div className="text-2xl font-bold text-primary leading-none">
                {template?.code.replace("نموذج", "").trim() || "9"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* العنوان */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-primary mb-1">{template?.name}</h1>
        <div className="text-sm text-muted-foreground">
          رقم المرجع: <span className="font-mono font-bold tabular-nums">{record.reference}</span>
        </div>
      </div>

      {/* بيانات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] text-muted-foreground">تاريخ الإنشاء</div>
          <div className="font-medium">{formatDateAr(record.createdAt)}</div>
        </div>
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] text-muted-foreground">الحالة</div>
          <div className="font-medium">{statusMeta.label}</div>
        </div>
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] text-muted-foreground">الأولوية</div>
          <div className="font-medium">
            {record.priority === "urgent" ? "عاجلة" : record.priority === "high" ? "عالية" : record.priority === "low" ? "منخفضة" : "عادية"}
          </div>
        </div>
        <div className="rounded-md border bg-muted/20 p-2">
          <div className="text-[10px] text-muted-foreground">تاريخ التقديم</div>
          <div className="font-medium">{formatDateAr(record.submittedAt)}</div>
        </div>
      </div>

      {/* الأقسام */}
      {schema.sections.map((section, idx) => (
        <div key={idx} className="mb-6">
          <div className="bg-primary/10 border-r-4 border-primary px-3 py-1.5 mb-3">
            <h2 className="font-bold text-sm text-primary">{section.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {section.fields.map((field) => {
              if (field.type === "divider") return null;
              const v = data[field.key];
              let display = "";
              if (Array.isArray(v)) {
                display = v.join("، ");
              } else if (field.type === "checkbox") {
                display = v ? "نعم" : "لا";
              } else {
                display = (v as string) || "—";
              }
              const isFull = field.width === "full" || field.type === "textarea" || field.type === "checkbox";
              return (
                <div key={field.key} className={isFull ? "col-span-2" : ""}>
                  <div className="text-[11px] text-muted-foreground mb-0.5">{field.label}</div>
                  <div className="text-sm border-b border-dotted border-slate-300 pb-1 min-h-[1.5rem] font-medium whitespace-pre-wrap break-words">
                    {display || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ملاحظات */}
      {record.notes && (
        <div className="mb-6">
          <div className="bg-primary/10 border-r-4 border-primary px-3 py-1.5 mb-2">
            <h2 className="font-bold text-sm text-primary">ملاحظات</h2>
          </div>
          <div className="text-sm border rounded-md p-3 bg-muted/10 whitespace-pre-wrap">
            {record.notes}
          </div>
        </div>
      )}

      {/* الاعتمادات */}
      {schema.approvals && schema.approvals.length > 0 && (
        <div className="mt-8">
          <div className="bg-primary/10 border-r-4 border-primary px-3 py-1.5 mb-3">
            <h2 className="font-bold text-sm text-primary">الاعتمادات والتوقيعات</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {schema.approvals.map((a, i) => (
              <div key={i} className="approval-cell text-center">
                <div className="text-xs font-bold mb-1">{a.label}</div>
                <div className="text-[10px] text-muted-foreground mb-6">
                  {a.description || "الاسم / التوقيع / التاريخ"}
                </div>
                <div className="h-px bg-slate-400 mb-1" />
                <div className="text-[9px] text-muted-foreground">التوقيع والختم</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* التذييل */}
      <div className="mt-10 pt-4 border-t border-dashed border-slate-300 text-center">
        <div className="text-[10px] text-muted-foreground">
          تم إنشاء هذا المستند بواسطة نظام إدارة النماذج الرسمية · {template?.code}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {formatDateAr(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}
