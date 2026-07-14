// الأنواع المشتركة بين الواجهة والخادم

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "email"
  | "phone"
  | "tel"
  | "signature"
  | "divider"
  | "info"

export interface FormField {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: string[]
  width?: "full" | "half" | "third"
  info?: string
  defaultValue?: string
}

export interface FormSection {
  title: string
  description?: string
  fields: FormField[]
}

export interface ApprovalBlock {
  role: string
  label: string
  description?: string
}

export interface FormSchema {
  sections: FormSection[]
  approvals?: ApprovalBlock[]
}

export interface FormTemplateT {
  id: string
  code: string
  name: string
  description: string
  category: string
  icon: string
  schema: FormSchema
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type RecordStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected"
export type RecordPriority = "low" | "normal" | "high" | "urgent"

export interface FormRecordT {
  id: string
  reference: string
  templateId: string
  template?: FormTemplateT
  applicantName: string
  subject: string
  status: RecordStatus
  priority: RecordPriority
  data: Record<string, unknown>
  notes: string | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  schema?: FormSchema
}

export const STATUS_META: Record<RecordStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "مسودة", color: "text-slate-600", bg: "bg-slate-100 text-slate-700 border-slate-200" },
  submitted: { label: "مُقدّم", color: "text-blue-600", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  under_review: { label: "قيد المراجعة", color: "text-amber-600", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "معتمد", color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "مرفوض", color: "text-rose-600", bg: "bg-rose-50 text-rose-700 border-rose-200" },
}

export const PRIORITY_META: Record<RecordPriority, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "text-slate-500" },
  normal: { label: "عادية", color: "text-slate-700" },
  high: { label: "عالية", color: "text-amber-600" },
  urgent: { label: "عاجلة", color: "text-rose-600" },
}

export const AR_PRIORITY_MAP: Record<string, string> = {
  "عادية": "normal",
  "عاجلة": "urgent",
  "هامة جداً": "high",
  "منخفضة": "low",
}

export function formatDateAr(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return "—"
  }
}

export function formatDateTimeAr(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}
