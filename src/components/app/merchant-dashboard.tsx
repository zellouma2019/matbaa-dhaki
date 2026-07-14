"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Settings,
  Store,
  Link2,
  Eye,
  RefreshCw,
  Search,
  MoreHorizontal,
  Lock,
  ShieldCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  Printer,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  User,
  Palette,
  Save,
  ChevronLeft,
  TrendingUp,
  DollarSign,
  Clock,
  Inbox,
  Download,
  FileText,
  Upload,
  X,
  Crown,
  QrCode,
  Trash2,
  CheckSquare,
  Check,
  CheckCircle2,
  LayoutGrid, Menu,
  Tag,
  StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Printer as PrinterIcon,
  BookOpen as BookOpenIcon,
  Scissors as ScissorsIcon,
  Palette as PaletteIcon,
  Image as ImageIcon,
  Tag as TagIcon,
  Layers as LayersIcon,
  PenTool as PenToolIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STATUS_META,
  STATUS_FLOW,
  formatDA,
  formatDateTimeAr,
} from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";
import { OrderDetailsRow } from "@/components/app/order-details-row";
import { AdminAnalytics } from "@/components/app/admin-analytics";
import { useShop } from "@/lib/shop-context";
import { SHOP_THEMES } from "@/lib/themes";
import { type FeatureKey } from "@/lib/shop-features";
import { DashboardSidebar, type SidebarSection } from "@/components/ui/dashboard-sidebar";
import QRCode from "qrcode";

// ===== الأنواع =====
interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  statusCounts: Record<string, number>;
  serviceCounts: { serviceType: string; count: number; revenue: number }[];
  recentOrders: PrintOrderLite[];
}

type MerchantTab = "home" | "orders" | "settings" | "share" | "preview";

// ===== المكون الرئيسي =====
export function MerchantDashboard({ shopId, shopSlug }: { shopId: string; shopSlug: string }) {
  const { shop, hasFeature, refreshShop } = useShop();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<MerchantTab>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // حالة الطلبات والإحصائيات
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rawOrders, setRawOrders] = useState<PrintOrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // فلترة البحث تتم بالذاكرة (بدون إعادة طلب من السيرفر)
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

  // اشتقاق الحالات المتاحة من STATUS_FLOW
  const bulkStatusOptions = useMemo(() => ["pending", "printing", "ready", "delivered"], []);

  const sidebarSections: SidebarSection[] = useMemo(() => [
    {
      title: "القائمة",
      items: [
        { key: "home", label: "الرئيسية", icon: LayoutGrid },
        { key: "orders", label: "الطلبات", icon: Package, badge: stats?.totalOrders || undefined },
        { key: "settings", label: "إعدادات المتجر", icon: Settings },
      ],
    },
    {
      title: "أدوات",
      items: [
        { key: "share", label: "مشاركة الرابط", icon: Link2 },
        { key: "preview", label: "معاينة المتجر", icon: Eye },
      ],
    },
  ], [stats?.totalOrders]);

  function toggleSelectAll() {
    if (selectedIds.size === orders.length && orders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkChangeStatus(newStatus: string) {
    if (selectedIds.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/orders/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: newStatus }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      toast.success("تم تحديث الحالة", {
        description: `${selectedIds.size} طلب ← ${STATUS_META[newStatus].label}`,
      });
      setSelectedIds(new Set());
      loadAll();
    } catch (e) {
      toast.error("خطأ", { description: (e as Error).message });
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/orders/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      toast.success("تم حذف الطلبات", {
        description: `تم حذف ${selectedIds.size} طلب`,
      });
      setSelectedIds(new Set());
      loadAll();
    } catch (e) {
      toast.error("خطأ", { description: (e as Error).message });
    } finally {
      setBulkLoading(false);
    }
  }

  function exportCSV() {
    if (orders.length === 0) return;
    const BOM = "\uFEFF";
    const header = "رقم الطلب,اسم العميل,الهاتف,الخدمة,الحالة,المجموع,التاريخ\n";
    const rows = orders.map((o) => {
      const customer = o.customer || {};
      const c = JSON.parse(JSON.stringify(customer));
      const name = String(c.name || "").replace(/,/g, ";");
      const phone = String(c.phone || "").replace(/,/g, ";");
      const service = String(o.serviceName || o.serviceType).replace(/,/g, ";");
      const status = STATUS_META[o.status]?.label || o.status;
      const total = o.total || 0;
      const date = formatDateTimeAr(o.createdAt).replace(/,/g, " ");
      return `${o.reference},${name},${phone},${service},${status},${total},${date}`;
    }).join("\n");
    const csv = BOM + header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `orders-${shop?.slug || "export"}-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/stats?shopId=${shopId}`).then((r) => r.json()),
      fetch(`/api/orders?${statusFilter !== "all" ? `status=${statusFilter}` : ""}&shopId=${shopId}`).then((r) => r.json()),
    ])
      .then(([s, o]) => {
        setStats(s);
        setRawOrders(o.orders || []);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        refreshShop();
      });
  }, [shopId, statusFilter, refreshShop]);

  useEffect(() => {
    if (unlocked) loadAll();
  }, [unlocked, loadAll]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: pin }),
      });
      if (res.ok) {
        toast.success("مرحباً بك في لوحة التحكم");
        setUnlocked(true);
        setPin("");
      } else {
        handleWrongPin();
      }
    } catch {
      handleWrongPin();
    } finally {
      setVerifying(false);
    }
  }

  function handleWrongPin() {
    setPinError(true);
    setPinAttempts((a) => a + 1);
    toast.error("كلمة المرور غير صحيحة", {
      description: pinAttempts >= 2 ? "محاولة أخيرة قبل القفل المؤقت" : `المتبقي ${3 - pinAttempts - 1} محاولات`,
    });
    setPin("");
    if (pinAttempts >= 2) {
      setTimeout(() => { setPinAttempts(0); setPinError(false); }, 5000);
    }
  }

  async function changeStatus(order: PrintOrderLite, status: string) {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, shopId }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      toast.success("تم تحديث الحالة", {
        description: `${order.reference} → ${STATUS_META[status].label}`,
      });
      setRawOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      loadAll();
    } catch (e) {
      toast.error("خطأ", { description: (e as Error).message });
    }
  }

  // ===== شاشة كلمة المرور =====
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-violet-50/30 p-4" dir="rtl">
        <Card className="max-w-sm w-full rounded-2xl shadow-xl border border-slate-200/60">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mb-5 shadow-lg shadow-violet-300/40">
                <Lock className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">لوحة تحكم المتجر</h2>
              <p className="text-sm text-slate-500 mt-2">أدخل كلمة المرور للوصول</p>
              <p className="text-xs text-violet-600 font-medium mt-1">مطبعة الذكي</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div className="relative">
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                  placeholder="• • • •"
                  className={cn(
                    "text-center text-2xl tracking-[0.5em] h-12 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 shadow-sm bg-slate-50 transition-shadow",
                    pinError && "ring-2 ring-rose-400 bg-rose-50/50 shadow-rose-100",
                  )}
                  maxLength={10}
                  autoFocus
                  dir="ltr"
                  disabled={verifying}
                />
              </div>
              {pinError && (
                <div className="flex items-center justify-center gap-2 text-sm text-rose-500">
                  <AlertCircle className="h-4 w-4" />
                  كلمة المرور غير صحيحة
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                disabled={pin.length < 1 || verifying}
              >
                <ShieldCheck className="h-4 w-4" />
                {verifying ? "جارٍ التحقق..." : "دخول"}
              </Button>
            </form>

            <p className="text-xs text-slate-400 mt-6 text-center">
              🔒 هذا القسم مخصص لصاحب المتجر فقط
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== لوحة التحكم الرئيسية =====
  const customerLink = typeof window !== "undefined" ? `${window.location.origin}/s/${shopSlug}` : `/s/${shopSlug}`;

  const statCards = [
    { title: "إجمالي الطلبات", value: stats?.totalOrders ?? 0, icon: Package, color: "text-violet-600", bg: "bg-violet-50/80" },
    { title: "إجمالي الإيرادات", value: formatDA(stats?.totalRevenue ?? 0), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50/80" },
    { title: "طلبات اليوم", value: stats?.todayOrders ?? 0, icon: TrendingUp, color: "text-sky-600", bg: "bg-sky-50/80" },
    { title: "قيد التنفيذ", value: (stats?.statusCounts?.printing ?? 0) + (stats?.statusCounts?.pending ?? 0), icon: Clock, color: "text-rose-600", bg: "bg-rose-50/80" },
  ];

  const quickFilters = [
    { value: "all", label: "الكل", count: stats?.totalOrders ?? 0 },
    { value: "pending", label: STATUS_META.pending.label, count: stats?.statusCounts?.pending ?? 0 },
    { value: "printing", label: STATUS_META.printing.label, count: stats?.statusCounts?.printing ?? 0 },
    { value: "ready", label: STATUS_META.ready.label, count: stats?.statusCounts?.ready ?? 0 },
    { value: "delivered", label: STATUS_META.delivered.label, count: stats?.statusCounts?.delivered ?? 0 },
  ];

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* ===== الشريط الجانبي ===== */}
      <DashboardSidebar
        sections={sidebarSections}
        activeKey={activeTab}
        onNavigate={(key) => setActiveTab(key as MerchantTab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        logo={
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: shop?.primaryColor || '#7c3aed' }}
            >
              {(() => {
                const Comp = DYN_ICON_MAP[shop?.logoIcon || "Printer"] || PrinterIcon;
                return <Comp className="h-5 w-5 text-white" />;
              })()}
            </div>
            <span className="font-bold text-sm text-white truncate">{shop?.name || "المتجر"}</span>
          </div>
        }
      />

      {/* ===== المحتوى الرئيسي ===== */}
      <div className="flex-1 bg-slate-50 overflow-auto">
        {/* ===== الشريط العلوي ===== */}
        <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:hidden"
              aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: shop?.primaryColor || '#7c3aed' }}
            >
              {(() => {
                const Comp = DYN_ICON_MAP[shop?.logoIcon || "Printer"] || PrinterIcon;
                return <Comp className="h-5 w-5 text-white" />;
              })()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate text-slate-800">{shop?.name || "المتجر"}</div>
              <div className="text-xs text-slate-400 truncate">لوحة التحكم</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={loadAll}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-10 w-10 rounded-lg shrink-0 transition-all duration-200"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </header>

        {/* ===== المحتوى ===== */}
        <main className="p-4 sm:p-6 space-y-6">
          {/* ===== تبويب الرئيسية ===== */}
          {activeTab === "home" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((c, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="text-2xl font-bold tabular-nums truncate text-slate-800">{c.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{c.title}</div>
                      </div>
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
                        <c.icon className={cn("h-5 w-5", c.color)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* آخر الطلبات */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="border-b border-slate-200/60 px-4 sm:px-6 pt-5 pb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Clock className="h-4 w-4 text-violet-500" />
                    آخر الطلبات
                  </h3>
                </div>
                <div className="p-0">
                  {loading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      جارٍ التحميل...
                    </div>
                  ) : !stats?.recentOrders?.length ? (
                    <div className="py-12 text-center">
                      <Inbox className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                      <p className="text-xs text-slate-400">لا توجد طلبات بعد</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {stats.recentOrders.slice(0, 5).map((o) => {
                        const meta = STATUS_META[o.status] || STATUS_META.pending;
                        return (
                          <div key={o.id} className="flex items-center justify-between px-4 sm:px-6 py-3.5 gap-3 hover:bg-slate-50 transition-colors duration-150">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-800">{o.reference}</span>
                                <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium", meta.bg)}>{meta.label}</span>
                              </div>
                              <div className="text-xs text-slate-400 truncate mt-0.5">
                                {o.customer.name} · {o.serviceName}
                              </div>
                            </div>
                            <div className="text-left shrink-0">
                              <div className="text-sm font-bold text-violet-600">{formatDA(o.total)}</div>
                              <div className="text-xs text-slate-400">{formatDateTimeAr(o.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* التحليلات */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <AdminAnalytics stats={stats} shopId={shopId} />
              </div>
            </div>
          )}

          {/* ===== تبويب الطلبات ===== */}
          {activeTab === "orders" && (
            <div className="space-y-5">
              {/* الفلاتر */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث برقم الطلب أو اسم/هاتف العميل..."
                    className="pr-10 text-sm h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && loadAll()}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="text-sm h-11 rounded-xl border-slate-200">
                        <SelectValue placeholder="كل الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        {STATUS_FLOW.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                        ))}
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {hasFeature("exportExcel") && (
                    <Button variant="outline" onClick={exportCSV} className="shrink-0 h-11 w-11 rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200" title="تصدير CSV">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" onClick={loadAll} className="shrink-0 h-11 w-11 rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </div>
              </div>

              {/* شرائح التصفية السريعة */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1 -mx-1 px-1">
                {quickFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 min-h-[44px]",
                      statusFilter === f.value
                        ? "bg-violet-600 text-white rounded-lg px-4 py-2"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg px-4 py-2",
                    )}
                  >
                    {f.label}
                    <span className={cn(
                      "tabular-nums text-xs px-2 py-0.5 rounded-md",
                      statusFilter === f.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                    )}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* جدول الطلبات - حاسوب */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hidden md:block">
                <div className="border-b border-slate-200/60 px-6 pt-5 pb-3">
                  <h3 className="text-sm font-semibold text-slate-800">الطلبات ({orders.length})</h3>
                </div>
                <div className="p-0">
                  {loading ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      جارٍ التحميل...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-16 text-center">
                      <Inbox className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400">لا توجد طلبات</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto custom-scroll">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/60">
                            {hasFeature("bulkActions") && (
                              <TableHead className="w-10 p-2">
                                <Checkbox
                                  checked={orders.length > 0 && selectedIds.size === orders.length}
                                  onCheckedChange={toggleSelectAll}
                                  aria-label="تحديد الكل"
                                />
                              </TableHead>
                            )}
                            <TableHead className="text-right text-xs text-slate-500 font-medium">رقم الطلب</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium">الخدمة</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium">العميل</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium hidden md:table-cell">الهاتف</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium hidden lg:table-cell">التفاصيل</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium">المجموع</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium hidden lg:table-cell">الربح</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium">الحالة</TableHead>
                            <TableHead className="text-right text-xs text-slate-500 font-medium hidden sm:table-cell">التاريخ</TableHead>
                            <TableHead className="text-center text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((o) => (
                            <OrderDetailsRow
                              key={o.id}
                              order={o}
                              onStatusChange={changeStatus}
                              selected={hasFeature("bulkActions") ? selectedIds.has(o.id) : undefined}
                              onToggleSelect={hasFeature("bulkActions") ? () => toggleSelect(o.id) : undefined}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>

              {/* بطاقات الطلبات - جوال */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:hidden">
                <div className="border-b border-slate-200/60 px-5 pt-5 pb-2">
                  <h3 className="text-sm font-semibold text-slate-800">الطلبات ({orders.length})</h3>
                </div>
                <div className="p-4 space-y-3">
                  {loading ? (
                    <div className="py-10 text-center text-slate-400 text-sm">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      جارٍ التحميل...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-10 text-center">
                      <Inbox className="h-10 w-10 mx-auto text-slate-200 mb-2" />
                      <p className="text-xs text-slate-400">لا توجد طلبات</p>
                    </div>
                  ) : (
                    orders.map((o) => <MobileOrderCard key={o.id} order={o} onStatusChange={changeStatus} shopId={shopId} />)
                  )}
                </div>
              </div>

              {/* شريط الإجراءات الجماعية العائم */}
              {hasFeature("bulkActions") && selectedIds.size > 0 && (
                <div className="fixed bottom-4 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-50 flex items-center gap-2 sm:gap-3 bg-white text-slate-800 rounded-xl px-3 sm:px-5 py-3 sm:py-3.5 shadow-xl border border-slate-200/60 animate-in slide-in-from-bottom-4 duration-200 overflow-x-auto">
                  <span className="text-sm font-semibold whitespace-nowrap text-violet-600">
                    <CheckSquare className="h-4 w-4 inline-block ml-1.5 -mt-0.5" />
                    {selectedIds.size} محدد
                  </span>
                  <div className="w-px h-6 bg-slate-200 shrink-0" />
                  <Select onValueChange={(v) => bulkChangeStatus(v)} disabled={bulkLoading}>
                    <SelectTrigger className="h-9 w-auto min-w-[110px] sm:min-w-[130px] text-xs rounded-lg border-slate-200">
                      <SelectValue placeholder="تغيير الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkStatusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={bulkDelete}
                    disabled={bulkLoading}
                    className="h-9 text-xs gap-1.5 rounded-lg active:scale-[0.98] transition-all duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف المحدد
                  </Button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all duration-200 text-slate-400 hover:text-slate-700"
                    aria-label="إلغاء التحديد"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {/* ===== تبويب إعدادات المتجر ===== */}
          {activeTab === "settings" && (
            <MerchantShopSettings shopId={shopId} shopSlug={shopSlug} />
          )}

          {/* ===== تبويب مشاركة الرابط ===== */}
          {activeTab === "share" && (
            <ShareLinkTab shopName={shop?.name || ""} shopSlug={shopSlug} customerLink={customerLink} />
          )}

          {/* ===== تبويب المعاينة ===== */}
          {activeTab === "preview" && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-lg text-slate-800">معاينة متجرك</h2>
                  <p className="text-sm text-slate-500 mt-1">هذا ما يراه زبائنك عند فتح الرابط</p>
                </div>
                <Button variant="outline" onClick={() => window.open(customerLink, "_blank")} className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shrink-0">
                  <ExternalLink className="h-4 w-4" />
                  فتح في نافذة جديدة
                </Button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="p-0">
                  <div className="bg-slate-100 p-3 flex items-center gap-2.5 border-b border-slate-200/60">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 bg-white rounded-lg px-4 py-1.5 text-xs text-slate-400 text-center shadow-sm border border-slate-200/60" dir="ltr">
                      {customerLink}
                    </div>
                  </div>
                  <iframe
                    src={customerLink}
                    className="w-full border-0"
                    style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}
                    title="معاينة المتجر"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ===== خريطة الأيقونات الديناميكية =====
const DYN_ICON_MAP: Record<string, LucideIcon> = {
  Printer: PrinterIcon,
  BookOpen: BookOpenIcon,
  Scissors: ScissorsIcon,
  Palette: PaletteIcon,
  Image: ImageIcon,
  Tag: TagIcon,
  Layers: LayersIcon,
  PenTool: PenToolIcon,
};

const ICON_LABELS: Record<string, string> = {
  Printer: "طابعة",
  BookOpen: "كتاب",
  Scissors: "مقص",
  Palette: "لوحة ألوان",
  Image: "صورة",
  Tag: "وسم",
  Layers: "طبقات",
  PenTool: "قلم",
};

// ===== قفل الميزات الاحترافية — يقرأ الحالة من قاعدة البيانات =====
function ProLock({ featureKey, children, title, desc }: { featureKey: FeatureKey | FeatureKey[]; children: React.ReactNode; title: string; desc: string }) {
  const { hasFeature, shop } = useShop();
  const keys = Array.isArray(featureKey) ? featureKey : [featureKey];
  const isEnabled = keys.some((k) => hasFeature(k));
  const [showContact, setShowContact] = useState(false);
  const contactNumber = shop?.ownerPhone || shop?.whatsapp || shop?.phone || "";

  return (
    <div className="relative">
      <div className={cn(!isEnabled && "opacity-50 blur-[1px] pointer-events-none select-none")}>
        {children}
      </div>
      {!isEnabled && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center rounded-xl z-10">
          <div className="bg-white rounded-xl p-6 text-center max-w-[260px] mx-4 shadow-xl border border-slate-200/60">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mb-4 shadow-lg shadow-violet-200/50">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-bold text-sm mb-1 text-slate-800">{title}</h4>
            <p className="text-xs text-slate-400 mb-5">{desc}</p>
            {!showContact ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98]"
                onClick={() => setShowContact(true)}
              >
                <Crown className="h-4 w-4 ml-1" />
                طلب تفعيل الميزة
              </Button>
            ) : (
              <div className="space-y-2">
                {contactNumber && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 active:scale-[0.98]"
                    onClick={() => {
                      const clean = contactNumber.replace(/\s/g, "");
                      const msg = encodeURIComponent(`مرحباً، أريد تفعيل ميزة "${title}" لمتجري`);
                      window.open(`https://wa.me/${clean.startsWith("0") ? "213" + clean.substring(1) : clean}?text=${msg}`, "_blank");
                    }}
                  >
                    <MessageCircle className="h-4 w-4 ml-1" />
                    واتساب
                  </Button>
                )}
                {contactNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200"
                    onClick={() => window.open(`tel:${contactNumber.replace(/\s/g, "")}`, "_self")}
                  >
                    <Phone className="h-4 w-4 ml-1" />
                    اتصل
                  </Button>
                )}
                <button
                  className="text-xs text-slate-400 hover:text-slate-600 mt-1 transition-colors duration-200"
                  onClick={() => setShowContact(false)}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== الخدمات الافتراضية =====
const DEFAULT_SERVICES = [
  { type: "document", name: "طباعة مستند", emoji: "🖨️", basePricePerPage: 5, enabled: true },
  { type: "photo", name: "طباعة صور", emoji: "🖼️", basePricePerPage: 25, enabled: true },
  { type: "binding", name: "تجليد", emoji: "📚", basePricePerPage: 0, enabled: true },
  { type: "copy", name: "نسخ مستندات", emoji: "📄", basePricePerPage: 4, enabled: true },
  { type: "card", name: "بطاقات", emoji: "🪪", basePricePerPage: 30, enabled: true },
  { type: "poster", name: "ملصقات", emoji: "📜", basePricePerPage: 50, enabled: true },
];

// ===== إعدادات المتجر (داخل لوحة التاجر) =====
function MerchantShopSettings({ shopId, shopSlug }: { shopId: string; shopSlug: string }) {
  const { shop, hasFeature, refreshShop } = useShop();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    primaryColor: "",
    ownerName: "",
    ownerPhone: "",
    adminPin: "",
    logoIcon: "Printer",
    themeId: 1,
  });

  // حالة الأيقونة المختارة
  const [selectedIcon, setSelectedIcon] = useState("Printer");
  // حالة القالب اللوني
  const [selectedThemeId, setSelectedThemeId] = useState(1);
  // حالة الشعار
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      setForm((f) => ({
        ...f,
        name: shop.name || "",
        phone: shop.phone || "",
        whatsapp: shop.whatsapp || "",
        email: shop.email || "",
        address: shop.address || "",
        primaryColor: shop.primaryColor || "",
        ownerName: shop.ownerName || "",
        ownerPhone: shop.ownerPhone || "",
        logoIcon: shop.logoIcon || "Printer",
        themeId: shop.themeId || 1,
      }));
      setLogoUrl(shop.logoUrl || null);
    }
  }, [shop]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData: Record<string, string | number> = { ...form };
      if (!updateData.adminPin) delete updateData.adminPin;

      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "فشل الحفظ");
      }
      toast.success("تم حفظ الإعدادات بنجاح");
      refreshShop();
    } catch (err) {
      toast.error("فشل الحفظ", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.adminPin || form.adminPin.length < 3) {
      toast.error("كلمة المرور قصيرة جداً");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: form.adminPin }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "فشل تغيير كلمة المرور");
      }
      toast.success("تم تغيير كلمة المرور بنجاح");
      setForm((f) => ({ ...f, adminPin: "" }));
    } catch (err) {
      toast.error("فشل تغيير كلمة المرور", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOwnerInfo() {
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName: form.ownerName, ownerPhone: form.ownerPhone }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      toast.success("تم حفظ معلومات المالك");
      refreshShop();
    } catch (err) {
      toast.error("فشل الحفظ", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // ===== رفع الشعار =====
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error("حجم الملف كبير جداً", { description: "الحد الأقصى 300 ك.ب" });
      return;
    }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("فشل قراءة الملف"));
        reader.readAsDataURL(file);
      });
      // حفظ الرابط في المتجر
      const saveRes = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: dataUrl }),
      });
      if (!saveRes.ok) throw new Error("فشل حفظ الشعار");
      setLogoUrl(dataUrl);
      toast.success("تم رفع الشعار بنجاح");
    } catch (err) {
      toast.error("فشل رفع الشعار", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setUploading(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error("فشل حذف الشعار");
      setLogoUrl(null);
      toast.success("تم حذف الشعار");
    } catch (err) {
      toast.error("فشل حذف الشعار", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  // ===== حفظ أيقونة الشعار =====
  async function handleSelectIcon(iconName: string) {
    setSelectedIcon(iconName);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoIcon: iconName }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      toast.success("تم تغيير أيقونة الشعار");
      refreshShop();
    } catch (err) {
      toast.error("فشل الحفظ", { description: (err as Error).message });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ===== عنوان التاجر ===== */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
          <User className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-800">{shop?.name || "التاجر"}</h2>
          <p className="text-xs text-slate-500">إعدادات المتجر والحساب</p>
        </div>
      </div>

      {/* ===== 1. رفع الشعار (customLogo) ===== */}
      <ProLock featureKey="customLogo" title="شعار المتجر" desc="ارفع شعار متجرك ليظهر للزبائن">
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="p-4 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
              <Upload className="h-4 w-4 text-violet-600" />
              شعار المتجر
              <Badge className="bg-gradient-to-r from-violet-600 to-violet-700 text-white text-[10px] px-2 py-0.5 rounded-md border-0 shadow-sm">PRO</Badge>
            </h3>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-200/60">
                  <img src={logoUrl} alt="شعار المتجر" className="w-full h-full object-cover" />
                  <button
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                    className="absolute top-1 left-1 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all duration-200 shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200/60 shadow-sm flex items-center justify-center shrink-0">
                  <Store className="h-8 w-8 text-slate-300" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition-all duration-200 border border-violet-200/60">
                    <Upload className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-medium text-violet-700">
                      {uploading ? "جارٍ الرفع..." : "اختر صورة"}
                    </span>
                  </div>
                </label>
                <p className="text-xs text-slate-400">الحد الأقصى: 300 ك.ب</p>
              </div>
            </div>
          </div>
        </div>
      </ProLock>

      {/* ===== 2. أيقونة الشعار (customLogo) ===== */}
      <ProLock featureKey="customLogo" title="أيقونة الشعار" desc="اختر أيقونة مميزة لشعار متجرك">
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="p-4 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
              <Palette className="h-4 w-4 text-violet-600" />
              أيقونة الشعار
              <Badge className="bg-gradient-to-r from-violet-600 to-violet-700 text-white text-[10px] px-2 py-0.5 rounded-md border-0 shadow-sm">PRO</Badge>
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
              {Object.entries(DYN_ICON_MAP).map(([name, IconComp]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectIcon(name)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                    selectedIcon === name
                      ? "bg-violet-50 shadow-md ring-1 ring-violet-300 border-violet-200"
                      : "bg-slate-50 hover:bg-slate-100 hover:shadow-md",
                  )}
                >
                  <IconComp className={cn("h-7 w-7", selectedIcon === name ? "text-violet-600 font-bold" : "text-slate-500")} />
                  <span className="text-xs font-medium text-slate-600">{ICON_LABELS[name]}</span>
                </button>
              ))}
            </div>
            {/* معاينة حية */}
            <div className="mt-3 pt-4 border-t border-slate-200/60">
              <p className="text-xs text-slate-400 mb-3">معاينة:</p>
              <div className="inline-flex items-center gap-2.5 p-3 rounded-xl shadow-sm" style={{ backgroundColor: shop?.primaryColor || "#7c3aed" }}>
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  {(() => {
                    const Comp = DYN_ICON_MAP[selectedIcon] || PrinterIcon;
                    return <Comp className="h-5 w-5 text-white" />;
                  })()}
                </div>
                <span className="font-bold text-sm text-white">{form.name || "اسم المتجر"}</span>
              </div>
            </div>
          </div>
        </div>
      </ProLock>

      {/* ===== 3. القالب اللوني (customLogo) ===== */}
      <ThemePickerSection shopSlug={shopSlug} shop={shop} />

      {/* ===== 4. معلومات المتجر (مجاني) ===== */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="p-4 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
              <Store className="h-4 w-4 text-violet-600" />
              معلومات المتجر
            </h3>
            <div>
              <Label className="text-slate-600 text-sm">اسم المتجر</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5 text-slate-600 text-sm"><Phone className="h-3.5 w-3.5 text-slate-400" />الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-slate-600 text-sm"><MessageCircle className="h-3.5 w-3.5 text-slate-400" />واتساب</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-slate-600 text-sm"><Mail className="h-3.5 w-3.5 text-slate-400" />البريد الإلكتروني</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-slate-600 text-sm"><MapPin className="h-3.5 w-3.5 text-slate-400" />العنوان</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </form>

      {/* ===== 5. إدارة الأسعار والخدمات (customPricing / serviceToggle) ===== */}
      <PriceEditorSection shopSlug={shopSlug} shop={shop} />

      {/* ===== 6. معلومات المالك + تغيير كلمة المرور (مجاني) ===== */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-4 sm:p-6 space-y-5">
          <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
            <User className="h-4 w-4 text-violet-600" />
            معلومات المالك
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-600 text-sm">الاسم</Label>
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
            </div>
            <div>
              <Label className="text-slate-600 text-sm">الهاتف</Label>
              <Input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className="mt-1.5 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all" dir="ltr" />
            </div>
          </div>
          <Button onClick={handleSaveOwnerInfo} className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ معلومات المالك"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-4 sm:p-6 space-y-5">
          <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
            <Lock className="h-4 w-4 text-violet-600" />
            تغيير كلمة المرور
          </h3>
          <form onSubmit={handleChangePin} className="flex gap-3">
            <Input
              value={form.adminPin}
              onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
              placeholder="كلمة المرور الجديدة"
              type="text"
              dir="ltr"
              className="flex-1 h-11 rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            <Button type="submit" variant="outline" disabled={saving || !form.adminPin} className="rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200 h-11 px-6">
              {saving ? "..." : "تغيير"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===== القالب اللوني =====
function ThemePickerSection({
  shopSlug,
  shop,
}: {
  shopSlug: string;
  shop: { themeId?: number } | null;
}) {
  const { hasFeature, refreshShop } = useShop();
  const canCustomize = hasFeature("customLogo");
  const [selectedThemeId, setSelectedThemeId] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      setSelectedThemeId(shop.themeId || 1);
    }
  }, [shop]);

  async function handleSelectTheme(themeId: number) {
    setSelectedThemeId(themeId);
    if (!canCustomize) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      toast.success("تم تغيير القالب اللوني");
      refreshShop();
    } catch (err) {
      toast.error("فشل الحفظ", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProLock featureKey="customLogo" title="القالب اللوني" desc="اختر قالب ألوان يناسب متجرك">
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-4 sm:p-6 space-y-5">
          <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
            <Palette className="h-4 w-4 text-violet-600" />
            القالب اللوني
            <Badge className="bg-gradient-to-r from-violet-600 to-violet-700 text-white text-[10px] px-2 py-0.5 rounded-md border-0 shadow-sm">PRO</Badge>
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SHOP_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={cn(
                  "rounded-xl overflow-hidden transition-all duration-200 text-right border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                  selectedThemeId === theme.id
                    ? "ring-2 ring-violet-500 shadow-md border-violet-200"
                    : "hover:shadow-md",
                )}
              >
                {/* معاينة مصغرة */}
                <div className="space-y-0">
                  {/* الشريط العلوي */}
                  <div className="h-2" style={{ backgroundColor: theme.topBar.bg }} />
                  {/* الترويسة */}
                  <div className="h-5 flex items-center gap-1 px-2" style={{ backgroundColor: theme.header.bg }}>
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.accent }} />
                    <div className="flex-1 h-1 rounded-full bg-gray-200" />
                  </div>
                  {/* المحتوى */}
                  <div className="h-8 bg-white" />
                  {/* التذييل */}
                  <div className="h-2" style={{ backgroundColor: theme.footer.bg }} />
                </div>
                {/* اسم القالب */}
                <div className="px-2.5 py-2 bg-slate-50">
                  <span className="text-[10px] font-medium text-slate-700">{theme.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ProLock>
  );
}

// ===== محرر الأسعار والخدمات =====
interface ServiceSpec {
  type: string;
  name: string;
  emoji: string;
  basePricePerPage: number;
  enabled: boolean;
}

function PriceEditorSection({
  shopSlug,
  shop,
}: {
  shopSlug: string;
  shop: { settings?: string | null } | null;
}) {
  const { hasFeature } = useShop();
  const canCustomize = hasFeature("customPricing") || hasFeature("serviceToggle");
  const [services, setServices] = useState<ServiceSpec[]>(DEFAULT_SERVICES);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      try {
        const raw = (shop.settings as string) || "{}";
        const parsed = JSON.parse(raw);
        if (parsed.services && Array.isArray(parsed.services)) {
          setServices(parsed.services);
        }
      } catch {
        // use defaults
      }
    }
  }, [shop]);

  function updateService(idx: number, patch: Partial<ServiceSpec>) {
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function handleSaveServices() {
    setSaving(true);
    try {
      // دمج مع الإعدادات الحالية
      let existingSettings: Record<string, unknown> = {};
      try {
        const raw = (shop?.settings as string) || "{}";
        existingSettings = JSON.parse(raw);
      } catch {
        // ignore
      }
      const newSettings = { ...existingSettings, services };
      const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: JSON.stringify(newSettings) }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      toast.success("تم حفظ الأسعار والخدمات");
    } catch (err) {
      toast.error("فشل الحفظ", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProLock featureKey={["customPricing", "serviceToggle"]} title="إدارة الأسعار والخدمات" desc="خصّص أسعار خدماتك بسهولة">
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-4 sm:p-6 space-y-5">
          <h3 className="text-sm font-semibold flex items-center gap-2.5 text-slate-800 border-r-4 border-violet-500 pr-3">
            <DollarSign className="h-4 w-4 text-violet-600" />
            إدارة الأسعار والخدمات
            <Badge className="bg-gradient-to-r from-violet-600 to-violet-700 text-white text-[10px] px-2 py-0.5 rounded-md border-0 shadow-sm">PRO</Badge>
          </h3>

          <div className="space-y-2.5">
            {services.map((svc, idx) => (
              <div key={svc.type} className="rounded-xl bg-slate-50 border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                {/* رأس الخدمة */}
                <button
                  type="button"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-right hover:bg-slate-100 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{svc.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-800">{svc.name}</div>
                      <div className="text-xs text-slate-400">
                        {svc.basePricePerPage > 0 ? `${svc.basePricePerPage} د.ج/صفحة` : "مجاني"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!svc.enabled && (
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300 rounded-lg">معطّل</Badge>
                    )}
                    <ChevronLeft
                      className={cn(
                        "h-4 w-4 text-slate-400 transition-transform duration-200",
                        expandedIdx === idx && "rotate-90",
                      )}
                    />
                  </div>
                </button>

                {/* تفاصيل الخدمة */}
                {expandedIdx === idx && (
                  <div className="border-t border-slate-200 bg-white px-4 py-4 space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500">اسم الخدمة</Label>
                      <Input
                        value={svc.name}
                        onChange={(e) => updateService(idx, { name: e.target.value })}
                        className="mt-1 h-10 text-sm rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">السعر الأساسي لكل صفحة (د.ج)</Label>
                      <Input
                        type="number"
                        value={svc.basePricePerPage}
                        onChange={(e) => updateService(idx, { basePricePerPage: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-10 text-sm rounded-xl border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        dir="ltr"
                        min={0}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`svc-enabled-${idx}`}
                        checked={svc.enabled}
                        onCheckedChange={(checked) => updateService(idx, { enabled: !!checked })}
                      />
                      <Label htmlFor={`svc-enabled-${idx}`} className="text-xs cursor-pointer text-slate-600">
                        الخدمة مفعّلة
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveServices}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ الأسعار"}
          </Button>
        </div>
      </div>
    </ProLock>
  );
}

// ===== تبويب مشاركة الرابط =====
function ShareLinkTab({ shopName, shopSlug, customerLink }: { shopName: string; shopSlug: string; customerLink: string }) {
  const [copied, setCopied] = useState(false);
  const [adminCopied, setAdminCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!customerLink) return;
    QRCode.toDataURL(customerLink, {
      width: 300,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    }).then(setQrUrl).catch(() => {});
  }, [customerLink]);

  async function robustCopy(text: string, successMsg: string, desc: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success(successMsg, { description: desc });
      return true;
    } catch {
      toast.error("فشل النسخ", { description: "جرب تحديد النص ونسخه يدوياً" });
      return false;
    }
  }

  function copyCustomerLink() {
    robustCopy(customerLink, "تم نسخ رابط الزبائن", "شاركه مع زبائنك");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyAdminLink() {
    const adminLink = `${customerLink}?admin=1`;
    robustCopy(adminLink, "تم نسخ رابط الإدارة", "احفظه لنفسك فقط — لا تشاركه");
    setAdminCopied(true);
    setTimeout(() => setAdminCopied(false), 2000);
  }

  function shareViaWhatsApp() {
    const text = `مرحباً! يمكنك تقديم طلبات الطباعة مباشرة من هنا: ${customerLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function downloadQR() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qr-${shopSlug}.png`;
    a.click();
  }

  function printQR() {
    if (!qrUrl) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    // Escape HTML to prevent XSS
    const safeName = shopName ? shopName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : "المتجر";
    const safeLink = customerLink ? customerLink.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : "";
    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${safeName} - رمز QR</title>
        <style>
          @media print { body { margin: 0; } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
          .container { text-align: center; border: 3px solid #1a1a1a; border-radius: 16px; padding: 30px 40px; max-width: 400px; }
          h1 { font-size: 24px; font-weight: bold; margin-bottom: 8px; direction: rtl; }
          p { font-size: 13px; color: #666; margin-bottom: 20px; direction: rtl; }
          img { width: 250px; height: 250px; margin: 0 auto 16px; display: block; }
          .url { font-size: 11px; color: #999; direction: ltr; word-break: break-all; margin-top: 12px; }
          .hint { font-size: 12px; color: #888; margin-top: 16px; direction: rtl; }
          .print-btn { margin-top: 20px; padding: 10px 32px; background: #1a1a1a; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
          .print-btn:hover { background: #333; }
          @media print { .print-btn, .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${safeName}</h1>
          <p>امسح الرمز للوصول إلى متجرنا</p>
          <img src="${qrUrl}" alt="QR Code" />
          <div class="url">${safeLink}</div>
          <div class="hint">📱 افتح كاميرا هاتفك ووجّهها نحو الرمز</div>
        </div>
        <button class="print-btn no-print" onclick="window.print()">🖨️ طباعة</button>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 flex items-center justify-center mb-4 border border-violet-200/60">
          <Link2 className="h-8 w-8 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">مشاركة متجرك</h2>
        <p className="text-sm text-slate-500 mt-1.5">انشر رابط متجرك ليزوره زبائنك ويقدمون طلباتهم</p>
      </div>

      {/* رابط الزبائن */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50/80 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">رابط الزبائن</h3>
              <p className="text-xs text-slate-400">هذا الرابط لمشاركته مع الزبائن فقط</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={customerLink}
              readOnly
              className="flex-1 bg-slate-50 text-sm rounded-xl border-slate-200 h-11"
              dir="ltr"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button onClick={copyCustomerLink} variant="outline" className="shrink-0 rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200 h-11 px-4">
              <Copy className="h-4 w-4" />
              {copied ? "تم!" : "نسخ"}
            </Button>
          </div>
        </div>
      </div>

      {/* ===== رمز QR / الباركود ===== */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-violet-50/80 flex items-center justify-center">
              <QrCode className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">رمز QR للمتجر</h3>
              <p className="text-xs text-slate-400">اطبعه واعرضه في محلك أو على وسائل التواصل</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            {qrUrl ? (
              <>
                <div className="rounded-xl p-5 bg-white shadow-sm border border-dashed border-slate-200">
                  <img src={qrUrl} alt="QR Code" className="w-48 h-48 md:w-56 md:h-56" />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  📱 امسح الرمز بكاميرا الهاتف للوصول مباشرة إلى متجر <strong className="text-slate-700">{shopName}</strong>
                </p>
                <div className="flex gap-3 w-full">
                  <Button onClick={printQR} variant="outline" className="flex-1 h-11 gap-2 rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200">
                    <Printer className="h-4 w-4" />
                    طباعة الباركود
                  </Button>
                  <Button onClick={downloadQR} variant="outline" className="flex-1 h-11 gap-2 rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200">
                    <Download className="h-4 w-4" />
                    تحميل الصورة
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-48 h-48 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200/60">
                <div className="text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full mx-auto mb-2" />
                  <span className="text-xs text-slate-400">جارٍ توليد الرمز...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* مشاركة عبر واتساب */}
      <Button onClick={shareViaWhatsApp} className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
        <MessageCircle className="h-5 w-5" />
        مشاركة عبر واتساب
      </Button>

      {/* رابط الإدارة */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ borderWidth: "1.5px", borderStyle: "dashed", borderColor: "#7c3aed" }}>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50/80 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">رابط الإدارة (لك أنت فقط)</h3>
              <p className="text-xs text-violet-600">⚠️ لا تشارك هذا الرابط مع أحد</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={`${customerLink}?admin=1`}
              readOnly
              className="flex-1 bg-slate-50 text-sm rounded-xl border-slate-200 h-11"
              dir="ltr"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button onClick={copyAdminLink} variant="outline" size="icon" className={cn("shrink-0 rounded-lg border-slate-200 transition-all duration-200 h-11 w-11", adminCopied ? "bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-50" : "hover:bg-slate-50")}>
              {adminCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* تعليمات */}
      <div className="bg-violet-50 rounded-xl p-5 space-y-3 border border-violet-100">
        <h4 className="font-bold text-sm text-violet-800">📌 كيف تستخدم هذه الأدوات؟</h4>
        <ul className="text-xs text-violet-700/90 space-y-2">
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5">✅</span>
            <span><strong>رابط الزبائن:</strong> أرسله لعملائك ليقدموا طلباتهم مباشرة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5">📸</span>
            <span><strong>رمز QR:</strong> اطبعه وضعه في محلك أو انشره على وسائل التواصل الاجتماعي</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5">🖨️</span>
            <span><strong>طباعة الباركود:</strong> يمكنك وضعه على واجهة المحل أو كاونتر الاستقبال</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5">🔒</span>
            <span><strong>رابط الإدارة:</strong> احفظه في هاتفك لمتابعة الطلبات وإدارة متجرك</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ===== بطاقة طلب للجوال =====
const SERVICE_EMOJI: Record<string, string> = {
  document: "🖨️", photo: "🖼️", binding: "📚", copy: "📄", card: "🪪", poster: "📜",
};

const OPTION_LABELS: Record<string, string> = {
  pages: "الصفحات", copies: "النسخ", color: "نوع الطباعة", paperSize: "حجم الورق",
  sides: "الوجهين", binding: "التجليد", paperType: "نوع الورق", photoSize: "حجم الصورة",
  finish: "التشطيب", retouch: "تحسينات", bindingType: "نوع التجليد", coverColor: "لون الغلاف",
  coverPrint: "طباعة الغلاف", cardType: "نوع البطاقة", lamination: "التغليف",
  posterSize: "حجم الملصق", material: "الخامة", sorting: "الترتيب", extras: "إضافات",
};

function MobileOrderCard({
  order,
  onStatusChange,
  shopId,
}: {
  order: PrintOrderLite;
  onStatusChange: (order: PrintOrderLite, status: string) => void;
  shopId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status];
  const serviceEmoji = SERVICE_EMOJI[order.serviceType] || "🖨️";

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-right hover:bg-slate-50 transition-colors duration-200"
      >
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{serviceEmoji}</span>
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold text-slate-800">{order.reference}</div>
              <div className="text-xs text-slate-400 mt-0.5">{order.serviceName}</div>
            </div>
          </div>
          <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium shrink-0", meta.bg)}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate text-slate-800">{order.customer.name}</div>
            <div className="text-xs text-slate-400" dir="ltr">{order.customer.phone}</div>
          </div>
          <div className="text-left shrink-0">
            <div className="font-bold text-violet-600 text-sm">{formatDA(order.total)}</div>
            <div className="text-xs text-slate-400">{order.pages}ص × {order.copies}ن</div>
          </div>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{formatDateTimeAr(order.createdAt)}</span>
          <span className={cn("flex items-center gap-1 text-violet-500", expanded && "rotate-90", "transition-transform duration-200")}>
            <ChevronLeft className="h-3.5 w-3.5" />
            {expanded ? "إخفاء" : "عرض التفاصيل"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">مواصفات الطباعة</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(order.options)
                .filter(([k, v]) => v !== undefined && v !== null && v !== "" && !["notes", "printRange", "pageRange", "totalPages"].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white shadow-sm border border-slate-200/60 px-3 py-2">
                    <div className="text-[11px] text-slate-400">{OPTION_LABELS[k as keyof typeof OPTION_LABELS] || k}</div>
                    <div className="text-xs font-semibold text-slate-800">{String(v)}</div>
                  </div>
                ))}
            </div>
          </div>

          {order.fileName && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">ملف الزبون</div>
              <div className="flex items-center gap-2 rounded-xl bg-white shadow-sm border border-slate-200/60 p-2.5">
                <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                <span className="text-xs truncate text-slate-700">{order.fileName}</span>
              </div>
            </div>
          )}

          {/* وسوم الطلب */}
          {order.tags && order.tags.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">الوسوم</div>
              <div className="flex flex-wrap gap-1.5">
                {order.tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ملاحظات الإدارة */}
          {order.adminNotes && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">ملاحظات داخلية</div>
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-2.5">
                <div className="flex items-start gap-1.5">
                  <StickyNote className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-800">{order.adminNotes}</span>
                </div>
              </div>
            </div>
          )}

          {/* تواريخ الطباعة */}
          {(order.startedPrintingAt || order.completedPrintingAt) && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">مراحل الطباعة</div>
              <div className="space-y-1.5">
                {order.startedPrintingAt && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <PrinterIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span>بدأ: {formatDateTimeAr(order.startedPrintingAt)}</span>
                  </div>
                )}
                {order.completedPrintingAt && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>انتهى: {formatDateTimeAr(order.completedPrintingAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-sm h-11 rounded-lg border-slate-200 hover:bg-slate-50 transition-all duration-200"
              onClick={() => window.open(`/api/orders/${order.id}/invoice?shopId=${shopId}`, "_blank")}
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
        <Button size="sm" className="text-sm h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all duration-200 active:scale-[0.98]">
          <MoreHorizontal className="h-3.5 w-3.5" />
          تغيير الحالة
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40 rounded-lg">
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