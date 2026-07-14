"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Search,
  MoreHorizontal,
  RefreshCw,
  Inbox,
  Settings,
  ListOrdered,
  ChevronLeft,
  FileText,
  Download,
  BarChart3,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_META,
  STATUS_FLOW,
  formatDA,
  formatDateTimeAr,
} from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";
import { cn } from "@/lib/utils";
import { OrderDetailsRow } from "@/components/app/order-details-row";
import { AdminSettings } from "@/components/app/admin-settings";
import { AdminAnalytics } from "@/components/app/admin-analytics";
import { ShopSettings } from "@/components/app/shop-settings";

interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  statusCounts: Record<string, number>;
  serviceCounts: { serviceType: string; count: number; revenue: number }[];
  recentOrders: PrintOrderLite[];
}

interface AdminPanelProps {
  onRefresh: () => void;
  shopId?: string | null;
  shopSlug?: string;
  shopAdminPin?: string;
  verifiedPin?: string;
}

const SERVICE_EMOJI: Record<string, string> = {
  document: "🖨️",
  photo: "🖼️",
  binding: "📚",
  copy: "📄",
  card: "🪪",
  poster: "📜",
};

const OPTION_LABELS: Record<string, string> = {
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

export function AdminPanel({ onRefresh, shopId, shopSlug, verifiedPin }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rawOrders, setRawOrders] = useState<PrintOrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // فلترة البحث تتم بالذاكرة
  const orders = useMemo(() => {
    if (!search) return rawOrders;
    const q = search.toLowerCase();
    return rawOrders.filter(
      (x) =>
        x.reference.toLowerCase().includes(q) ||
        x.customer.name.includes(search) ||
        x.customer.phone.includes(search),
    );
  }, [rawOrders, search]);

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/stats${shopId ? `?shopId=${shopId}` : ""}`).then((r) => r.json()),
      fetch(`/api/orders?${statusFilter !== "all" ? `status=${statusFilter}` : ""}${shopId ? `&shopId=${shopId}` : ""}`).then((r) => r.json()),
    ])
      .then(([s, o]) => {
        setStats(s);
        setRawOrders(o.orders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, [statusFilter]);

  async function changeStatus(order: PrintOrderLite, status: string) {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, shopId: shopId || undefined }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      toast.success("تم تحديث الحالة", {
        description: `${order.reference} → ${STATUS_META[status].label}`,
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      loadAll();
    } catch (e) {
      toast.error("خطأ", { description: (e as Error).message });
    }
  }

  const statCards = [
    {
      title: "إجمالي الطلبات",
      value: stats?.totalOrders ?? 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "إجمالي الإيرادات",
      value: formatDA(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "طلبات اليوم",
      value: stats?.todayOrders ?? 0,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "قيد الطباعة",
      value: (stats?.statusCounts?.printing ?? 0) + (stats?.statusCounts?.pending ?? 0),
      icon: Clock,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  const quickFilters = [
    { value: "all", label: "الكل", count: stats?.totalOrders ?? 0 },
    { value: "pending", label: STATUS_META.pending.label, count: stats?.statusCounts?.pending ?? 0 },
    { value: "printing", label: STATUS_META.printing.label, count: stats?.statusCounts?.printing ?? 0 },
    { value: "ready", label: STATUS_META.ready.label, count: stats?.statusCounts?.ready ?? 0 },
    { value: "delivered", label: STATUS_META.delivered.label, count: stats?.statusCounts?.delivered ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((c, i) => (
          <Card key={i} className="rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardContent className="p-3 md:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-base md:text-2xl font-bold tabular-nums truncate text-slate-800">{c.value}</div>
                  <div className="text-xs md:text-xs text-slate-400 mt-1">{c.title}</div>
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                  <c.icon className={`h-4 w-4 md:h-5 md:w-5 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* التبويبات: الطلبات + الإعدادات */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className={`grid w-full max-w-lg ${shopId ? "grid-cols-4" : "grid-cols-3"} bg-slate-100 p-1 rounded-xl`}>
          <TabsTrigger value="orders" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white">
            <ListOrdered className="h-4 w-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
          {shopId && (
            <TabsTrigger value="shop" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white">
              <Store className="h-4 w-4" />
              المتجر
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:hover:bg-violet-700 data-[state=active]:hover:text-white">
            <BarChart3 className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
        </TabsList>

        {/* ===== تبويب الطلبات ===== */}
        <TabsContent value="orders" className="space-y-3 mt-4">
          {/* صف الملخص */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Package className="h-3.5 w-3.5" />
                الإجمالي:
                <span className="font-bold text-slate-800 tabular-nums">
                  {stats?.totalOrders ?? 0}
                </span>
              </span>
              <span className="text-slate-400/40">|</span>
              <span className="text-slate-400">
                المعروض:
                <span className="font-bold text-slate-800 tabular-nums mr-1">
                  {orders.length}
                </span>
              </span>
            </div>
            <span className="text-slate-400 tabular-nums shrink-0 hidden sm:flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {stats?.todayOrders ?? 0} طلب اليوم
            </span>
          </div>

          {/* الفلاتر */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث برقم الطلب أو اسم/هاتف العميل..."
                  className="pr-9 text-sm h-9"
                  onKeyDown={(e) => e.key === "Enter" && loadAll()}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue placeholder="كل الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      {STATUS_FLOW.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_META[s].label}
                        </SelectItem>
                      ))}
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" onClick={loadAll} className="shrink-0 h-9 w-9">
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* شرائح التصفية السريعة */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1 -mx-1 px-1">
              {quickFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                    statusFilter === f.value
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular-nums text-xs px-1.5 rounded-lg",
                      statusFilter === f.value ? "bg-white/20" : "bg-slate-100",
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* جدول الطلبات - حاسوب */}
          <Card className="hidden md:block rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base text-slate-800">
                الطلبات ({orders.length}) — اضغط على أي طلب لعرض التفاصيل
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  جارٍ التحميل...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center">
                  <Inbox className="h-12 w-12 mx-auto text-slate-400/50 mb-3" />
                  <p className="text-sm text-slate-400">لا توجد طلبات</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100/40">
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">رقم الطلب</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">الخدمة</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">العميل</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">الهاتف</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">التفاصيل</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">المجموع</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">الحالة</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">التاريخ</TableHead>
                        <TableHead className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <OrderDetailsRow key={o.id} order={o} onStatusChange={changeStatus} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* بطاقات الطلبات - جوال */}
          <Card className="md:hidden rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-800">الطلبات ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {loading ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  جارٍ التحميل...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center">
                  <Inbox className="h-10 w-10 mx-auto text-slate-400/50 mb-2" />
                  <p className="text-xs text-slate-400">لا توجد طلبات</p>
                </div>
              ) : (
                orders.map((o) => (
                  <MobileOrderCard key={o.id} order={o} onStatusChange={changeStatus} />
                ))
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* ===== تبويب الإعدادات ===== */}
        <TabsContent value="settings" className="mt-4">
          <AdminSettings shopId={shopId} />
        </TabsContent>

        {/* ===== تبويب إعدادات المتجر ===== */}
        {shopId && (
          <TabsContent value="shop" className="mt-4">
            <ShopSettings slug={shopSlug || ""} verifiedPin={verifiedPin} initiallyUnlocked />
          </TabsContent>
        )}

        {/* ===== تبويب التحليلات ===== */}
        <TabsContent value="analytics" className="mt-4">
          <AdminAnalytics stats={stats} shopId={shopId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== بطاقة طلب للجوال =====
function MobileOrderCard({
  order,
  onStatusChange,
}: {
  order: PrintOrderLite;
  onStatusChange: (order: PrintOrderLite, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status];
  const serviceEmoji = SERVICE_EMOJI[order.serviceType] || "🖨️";

  return (
    <div className="rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] bg-white overflow-hidden">
      {/* رأس البطاقة - قابل للنقر */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-right hover:bg-slate-100/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{serviceEmoji}</span>
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold text-slate-800">{order.reference}</div>
              <div className="text-xs text-slate-400">{order.serviceName}</div>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-lg border shrink-0 ${meta.bg}`}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate text-slate-800">{order.customer.name}</div>
            <div className="text-xs text-slate-400" dir="ltr">{order.customer.phone}</div>
          </div>
          <div className="text-left shrink-0">
            <div className="font-bold text-violet-700 text-sm">{formatDA(order.total)}</div>
            <div className="text-xs text-slate-400">{order.pages}ص × {order.copies}ن</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200/40 flex items-center justify-between text-xs text-slate-400">
          <span>{formatDateTimeAr(order.createdAt)}</span>
          <span className={`flex items-center gap-1 text-violet-600 ${expanded ? "rotate-90" : ""} transition-transform`}>
            <ChevronLeft className="h-3 w-3" />
            {expanded ? "إخفاء" : "عرض التفاصيل"}
          </span>
        </div>
      </button>

      {/* التفاصيل المنسدلة */}
      {expanded && (
        <div className="border-t bg-violet-50/40 p-3 space-y-3">
          {/* مواصفات الطباعة */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1.5">مواصفات الطباعة</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(order.options)
                .filter(([k, v]) => v !== undefined && v !== null && v !== "" && !["notes", "printRange", "pageRange", "totalPages"].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="rounded bg-white border border-violet-100 px-2 py-1">
                    <div className="text-xs text-slate-400">{OPTION_LABELS[k as keyof typeof OPTION_LABELS] || k}</div>
                    <div className="text-xs font-semibold text-slate-800">{String(v)}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* الملف */}
          {order.fileName && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1.5">ملف الزبون</div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white border border-violet-100 p-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="h-4 w-4 text-violet-600 shrink-0" />
                  <span className="text-xs truncate">{order.fileName}</span>
                </div>
              </div>
            </div>
          )}

          {/* العميل والتسليم */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-white border border-violet-100 p-2">
              <div className="text-slate-400 mb-0.5">الاستلام</div>
              <div className="font-medium">{order.customer.deliveryMethod === "delivery" ? "توصيل" : "من المطبعة"}</div>
            </div>
            <div className="rounded bg-white border border-violet-100 p-2">
              <div className="text-slate-400 mb-0.5">الوقت المتوقع</div>
              <div className="font-medium">{order.estimatedHours} ساعة</div>
            </div>
          </div>

          {/* ملاحظات */}
          {order.options.notes && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">ملاحظات</div>
              <div className="rounded bg-white border border-violet-100 p-2 text-xs text-slate-700 whitespace-pre-wrap">
                {order.options.notes}
              </div>
            </div>
          )}

          {/* أزرار */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-sm h-9"
              onClick={() => window.open(`/api/orders/${order.id}/invoice${shopId ? `?shopId=${shopId}` : ""}`, "_blank")}
            >
              <Download className="h-3.5 w-3.5" />
              الفاتورة
            </Button>
            <ChangeStatusSelect order={order} onChange={onStatusChange} />
          </div>
        </div>
      )}
    </div>
  );
}

// قائمة تغيير الحالة للجوال
function ChangeStatusSelect({
  order,
  onChange,
}: {
  order: PrintOrderLite;
  onChange: (order: PrintOrderLite, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="text-sm h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <MoreHorizontal className="h-3.5 w-3.5" />
          تغيير الحالة
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {STATUS_FLOW.filter((s) => s !== order.status).map((s) => (
          <DropdownMenuItem key={s} onClick={() => { onChange(order, s); setOpen(false); }}>
            <span className="mr-2">{STATUS_META[s].emoji}</span>
            {STATUS_META[s].label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => { onChange(order, "cancelled"); setOpen(false); }}>
          إلغاء الطلب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

