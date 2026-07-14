"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreHorizontal,
  Eye,
  Printer,
  Trash2,
  Pencil,
  FileText,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FormRecordT,
  type FormTemplateT,
  type RecordStatus,
  STATUS_META,
  formatDateAr,
} from "@/lib/types";

interface RecordsListProps {
  templates: FormTemplateT[];
  onEdit: (record: FormRecordT) => void;
  onPrint: (record: FormRecordT) => void;
  refreshKey: number;
}

export function RecordsList({ templates, onEdit, onPrint, refreshKey }: RecordsListProps) {
  const [records, setRecords] = useState<FormRecordT[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    fetch(`/api/records?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setRecords(d.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [statusFilter, search, refreshKey]);

  const filtered = useMemo(() => {
    return records.filter((r) =>
      templateFilter === "all" ? true : r.templateId === templateFilter,
    );
  }, [records, templateFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/records/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      toast.success("تم حذف السجل بنجاح");
      setRecords((prev) => prev.filter((r) => r.id !== deleteId));
    } catch (e) {
      toast.error("خطأ في الحذف", { description: (e as Error).message });
    } finally {
      setDeleteId(null);
    }
  }

  async function changeStatus(record: FormRecordT, status: RecordStatus) {
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      toast.success("تم تحديث الحالة", {
        description: `${record.reference} → ${STATUS_META[status].label}`,
      });
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status } : r)),
      );
    } catch (e) {
      toast.error("خطأ", { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">سجلات الطلبات</h2>
          <p className="text-sm text-muted-foreground">
            جميع الطلبات والنماذج المحفوظة في النظام
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetch(`/api/records`)
              .then((r) => r.json())
              .then((d) => setRecords(d.records || []))
              .finally(() => setLoading(false));
          }}
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </div>

      {/* الفلاتر */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الموضوع أو الرقم المرجعي..."
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="submitted">مُقدّم</SelectItem>
            <SelectItem value="under_review">قيد المراجعة</SelectItem>
            <SelectItem value="approved">معتمد</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger>
            <SelectValue placeholder="كل النماذج" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل النماذج</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.code} — {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                جارٍ التحميل...
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {records.length === 0
                  ? "لا توجد سجلات بعد. ابدأ بتعبئة نموذج جديد."
                  : "لا توجد نتائج مطابقة لبحثك"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">الرقم المرجعي</TableHead>
                    <TableHead className="text-right">النموذج</TableHead>
                    <TableHead className="text-right">مقدم الطلب</TableHead>
                    <TableHead className="text-right">الموضوع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الأولوية</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const meta = STATUS_META[r.status];
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs tabular-nums">
                          {r.reference}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {r.template?.code.replace("نموذج", "ن").trim() || "ن"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate max-w-[120px]">
                                {r.template?.code}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {r.template?.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.applicantName}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {r.subject}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.bg}`}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.priority === "urgent"
                            ? "عاجلة"
                            : r.priority === "high"
                              ? "عالية"
                              : r.priority === "low"
                                ? "منخفضة"
                                : "عادية"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDateAr(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44">
                              <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onEdit(r)}>
                                <Pencil className="h-4 w-4" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onPrint(r)}>
                                <Printer className="h-4 w-4" />
                                عرض / طباعة
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                              {(["draft", "submitted", "under_review", "approved", "rejected"] as RecordStatus[])
                                .filter((s) => s !== r.status)
                                .map((s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => changeStatus(r, s)}
                                  >
                                    <FileText className="h-4 w-4" />
                                    {STATUS_META[s].label}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteId(r.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
