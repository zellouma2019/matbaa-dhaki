"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Receipt,
  Plus,
  Trash2,
  Loader2,
  TrendingDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { formatDA, formatDateAr } from "@/lib/print-config";

const CATEGORIES = [
  { value: "paper", label: "ورق", emoji: "📄" },
  { value: "ink", label: "حبر", emoji: "🖤" },
  { value: "maintenance", label: "صيانة", emoji: "🔧" },
  { value: "rent", label: "إيجار", emoji: "🏠" },
  { value: "other", label: "أخرى", emoji: "📦" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const HEADERS = { "Content-Type": "application/json" };

function useAdminHeaders() {
  const adminCode = useAppStore((s) => s.adminCode);
  return { ...HEADERS, "x-admin-code": adminCode };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function AdminExpenses() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(todayStr());

  const queryClient = useQueryClient();
  const headers = useAdminHeaders();

  const limit = 50;

  const fetchExpenses = useCallback(async (): Promise<{
    expenses: Expense[];
    totalAmount: number;
    pagination: PaginationInfo;
  }> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/expenses?${params}`, { headers });
    if (!res.ok) throw new Error("فشل تحميل المصاريف");
    return res.json();
  }, [page, categoryFilter, headers]);

  const fetchMonthTotal = useCallback(async (): Promise<number> => {
    const from = monthStartStr();
    const res = await fetch(`/api/expenses?from=${from}&limit=1`, { headers });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.totalAmount || 0;
  }, [headers]);

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page, categoryFilter],
    queryFn: fetchExpenses,
    staleTime: 15_000,
  });

  const { data: monthTotal } = useQuery({
    queryKey: ["expenses-month-total"],
    queryFn: fetchMonthTotal,
    staleTime: 30_000,
  });

  const expenses = data?.expenses ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 0 };
  const allTimeTotal = data?.totalAmount ?? 0;

  const resetForm = () => {
    setFormCategory("");
    setFormAmount("");
    setFormDescription("");
    setFormDate(todayStr());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formAmount) {
      toast.error("الفئة والمبلغ مطلوبان");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: formCategory,
          amount: Number(formAmount),
          description: formDescription || undefined,
          date: formDate || undefined,
        }),
      });
      if (res.ok) {
        toast.success("تمت إضافة المصروف بنجاح");
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expenses-month-total"] });
      } else {
        const r = await res.json();
        toast.error(r.error || "فشل الإضافة");
      }
    } catch {
      toast.error("خطأ في إضافة المصروف");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setEditCategory(exp.category);
    setEditAmount(String(exp.amount));
    setEditDescription(exp.description || "");
    setEditDate(exp.date);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editCategory || !editAmount) {
      toast.error("الفئة والمبلغ مطلوبان");
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          category: editCategory,
          amount: Number(editAmount),
          description: editDescription || undefined,
          date: editDate || undefined,
        }),
      });
      if (res.ok) {
        toast.success("تم تحديث المصروف بنجاح");
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expenses-month-total"] });
      } else {
        const r = await res.json();
        toast.error(r.error || "فشل التحديث");
      }
    } catch {
      toast.error("خطأ في تحديث المصروف");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("تم حذف المصروف");
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expenses-month-total"] });
      } else {
        const r = await res.json();
        toast.error(r.error || "فشل الحذف");
      }
    } catch {
      toast.error("خطأ في حذف المصروف");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = (value: string) => {
    setCategoryFilter(value === "__all__" ? null : value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ===== العنوان ===== */}
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Receipt className="h-5 w-5 text-amber-600" />
        إدارة المصاريف
      </h2>

      {/* ===== نموذج الإضافة ===== */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
            <Plus className="h-4 w-4 text-emerald-600" />
            إضافة مصروف جديد
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الفئة</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="اختر الفئة..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">المبلغ (دج)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="h-9"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوصف</Label>
              <Input
                placeholder="وصف اختياري..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التاريخ</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-9"
                dir="ltr"
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting || !formCategory || !formAmount} size="sm" className="gap-1.5">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            إضافة
          </Button>
        </form>
      </Card>

      {/* ===== ملخص المصاريف ===== */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">مصاريف الشهر</span>
          </div>
          <p className="text-xl font-bold">{formatDA(monthTotal ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-rose-600" />
            <span className="text-xs text-muted-foreground">إجمالي المصاريف</span>
          </div>
          <p className="text-xl font-bold">{formatDA(allTimeTotal)}</p>
        </Card>
      </div>

      {/* ===== فلتر الفئات ===== */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!categoryFilter ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => handleFilterChange("__all__")}
        >
          الكل
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={categoryFilter === cat.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => handleFilterChange(cat.value)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </Button>
        ))}
      </div>

      {/* ===== التحميل ===== */}
      {isLoading && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          جارٍ تحميل المصاريف...
        </div>
      )}

      {/* ===== قائمة فارغة ===== */}
      {!isLoading && expenses.length === 0 && (
        <Card className="p-8 text-center">
          <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {categoryFilter ? "لا توجد مصاريف في هذه الفئة" : "لا توجد مصاريف مسجّلة بعد"}
          </p>
        </Card>
      )}

      {/* ===== جدول سطح المكتب ===== */}
      {!isLoading && expenses.length > 0 && (
        <>
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>الفئة</TableHead>
                  <TableHead className="text-center">المبلغ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => {
                  const cat = CATEGORY_MAP[exp.category];
                  const isEditing = editingId === exp.id;
                  return (
                    <TableRow key={exp.id} className="group">
                      <TableCell>
                        {isEditing ? (
                          <Select value={editCategory} onValueChange={setEditCategory}>
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.emoji} {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <span>{cat?.emoji || "📦"}</span>
                            <span>{cat?.label || exp.category}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-8 w-28 text-center text-xs mx-auto"
                            dir="ltr"
                          />
                        ) : (
                          <span className="font-semibold text-rose-600">
                            {formatDA(exp.amount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="h-8 text-xs"
                            placeholder="وصف..."
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {exp.description || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="h-8 text-xs w-36"
                            dir="ltr"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDateAr(exp.date)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleSaveEdit(exp.id)}
                                disabled={savingId === exp.id}
                              >
                                {savingId === exp.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                onClick={cancelEdit}
                                disabled={savingId === exp.id}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => startEdit(exp)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDelete(exp.id)}
                                disabled={deletingId === exp.id}
                              >
                                {deletingId === exp.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* ===== بطاقات الجوال ===== */}
          <div className="md:hidden space-y-3">
            {expenses.map((exp) => {
              const cat = CATEGORY_MAP[exp.category];
              const isEditing = editingId === exp.id;
              return (
                <Card key={exp.id} className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">الفئة</Label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.emoji} {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">المبلغ (دج)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-9"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">التاريخ</Label>
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="h-9"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الوصف</Label>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-9"
                          placeholder="وصف اختياري..."
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleSaveEdit(exp.id)}
                          disabled={savingId === exp.id}
                        >
                          {savingId === exp.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          حفظ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={savingId === exp.id}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <span className="flex items-center gap-1.5 font-bold text-sm">
                          <span>{cat?.emoji || "📦"}</span>
                          <span>{cat?.label || exp.category}</span>
                        </span>
                        <div className="flex gap-1 shrink-0 mr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600"
                            onClick={() => startEdit(exp)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500"
                            onClick={() => handleDelete(exp.id)}
                            disabled={deletingId === exp.id}
                          >
                            {deletingId === exp.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-rose-600 mb-1">{formatDA(exp.amount)}</p>
                      {exp.description && (
                        <p className="text-xs text-muted-foreground mb-1">{exp.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDateAr(exp.date)}</p>
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          {/* ===== الترقيم ===== */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}