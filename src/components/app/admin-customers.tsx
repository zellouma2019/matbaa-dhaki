"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users,
  RefreshCw,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { formatDA, formatDateTimeAr } from "@/lib/print-config";

interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomerEditData {
  name: string;
  email: string;
  address: string;
  notes: string;
}

const HEADERS = { "Content-Type": "application/json" };

function useAdminHeaders() {
  const adminCode = useAppStore((s) => s.adminCode);
  return { ...HEADERS, "x-admin-code": adminCode };
}

export function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editData, setEditData] = useState<CustomerEditData>({ name: "", email: "", address: "", notes: "" });
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const headers = useAdminHeaders();

  const limit = 20;

  const fetchCustomers = useCallback(async (): Promise<{ customers: Customer[]; pagination: PaginationInfo }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    const res = await fetch(`/api/customers?${params}`, { headers });
    if (!res.ok) throw new Error("فشل تحميل العملاء");
    return res.json();
  }, [page, search, headers]);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: fetchCustomers,
    staleTime: 15_000,
  });

  const customers = data?.customers ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 0 };

  // Compute stats from pagination
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);
  const allCustomersTotal = pagination.total;
  const avgPerCustomer = allCustomersTotal > 0 ? Math.round(totalSpent / allCustomersTotal) : 0;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "sync" }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`تم مزامنة ${result.synced} عميل`);
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        toast.error(result.error || "فشلت المزامنة");
      }
    } catch {
      toast.error("خطأ في المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditData({
      name: customer.name,
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editingCustomer) return;
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        toast.success("تم تحديث بيانات العميل");
        setEditingCustomer(null);
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        const r = await res.json();
        toast.error(r.error || "فشل التحديث");
      }
    } catch {
      toast.error("خطأ في التحديث");
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("تم حذف العميل");
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        const r = await res.json();
        toast.error(r.error || "فشل الحذف");
      }
    } catch {
      toast.error("خطأ في الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ===== الشريط العلوي ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          إدارة العملاء
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:flex-initial">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 w-full sm:w-64 h-9"
            />
          </form>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 gap-1.5"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            مزامنة
          </Button>
        </div>
      </div>

      {/* ===== شريط الإحصائيات ===== */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">إجمالي العملاء</span>
          </div>
          <p className="text-xl font-bold">{allCustomersTotal}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">إجمالي الإنفاق</span>
          </div>
          <p className="text-xl font-bold">{formatDA(totalSpent)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">المتوسط / عميل</span>
          </div>
          <p className="text-xl font-bold">{formatDA(avgPerCustomer)}</p>
        </Card>
      </div>

      {/* ===== التحميل ===== */}
      {isLoading && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          جارٍ تحميل العملاء...
        </div>
      )}

      {/* ===== القائمة فارغة ===== */}
      {!isLoading && customers.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm mb-3">
            {search ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء مسجّلين بعد"}
          </p>
          {!search && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : <RefreshCw className="h-4 w-4 ml-1.5" />}
              مزامنة من الطلبات
            </Button>
          )}
        </Card>
      )}

      {/* ===== جدول سطح المكتب ===== */}
      {!isLoading && customers.length > 0 && (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead className="text-center">الطلبات</TableHead>
                  <TableHead className="text-center">الإنفاق</TableHead>
                  <TableHead>آخر طلب</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span dir="ltr">{c.phone}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.email ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.address ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="max-w-[150px] truncate">{c.address}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">{c.totalOrders}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{formatDA(c.totalSpent)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTimeAr(c.lastOrderAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => confirmDelete(c.id)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5" dir="ltr">
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 mr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500"
                      onClick={() => confirmDelete(c.id)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {c.email && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                  )}
                  {c.address && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{c.totalOrders} طلب</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-sm font-medium">{formatDA(c.totalSpent)}</span>
                  </div>
                  {c.lastOrderAt && (
                    <span className="text-xs text-muted-foreground mr-auto">
                      {formatDateTimeAr(c.lastOrderAt)}
                    </span>
                  )}
                </div>
              </Card>
            ))}
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

      {/* ===== تأكيد حذف العميل ===== */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العميل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== نافذة تعديل العميل ===== */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-600" />
              تعديل بيانات العميل
            </DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الهاتف</Label>
                <Input value={editingCustomer.phone} disabled className="bg-muted" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  value={editData.email}
                  onChange={(e) => setEditData((d) => ({ ...d, email: e.target.value }))}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData((d) => ({ ...d, address: e.target.value }))}
                  placeholder="العنوان"
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="ملاحظات إدارية..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingCustomer(null)}>
              إلغاء
            </Button>
            <Button onClick={saveEdit}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}