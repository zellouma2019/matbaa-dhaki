"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Store, Copy, Trash2, ExternalLink, RefreshCw, Shield,
  Package, DollarSign, TrendingUp, Clock, Eye, EyeOff,
  Search, BarChart3, Users,
  Settings, LayoutGrid, Link2, Lock, CheckCircle2, Check,
  Pencil, CalendarDays, Timer, CreditCard, ToggleLeft,
  Zap, Infinity, XCircle, UserPlus, Mail, LogOut, Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  STATUS_META, STATUS_FLOW, formatDA, formatDateTimeAr,
} from "@/lib/print-config";
import {
  FEATURE_DEFINITIONS, CUSTOMER_FEATURES, MERCHANT_FEATURES,
  parseFeatures, countEnabledFeatures, TOTAL_FEATURES,
  type FeatureKey, type ShopFeatures,
} from "@/lib/shop-features";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DashboardSidebar } from "@/components/ui/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ===== الأنواع =====
interface ShopItem {
  id: string; slug: string; name: string; phone: string | null;
  ownerName: string | null; ownerPhone: string | null;
  isActive: boolean; createdAt: string;
  _count: { orders: number };
}

interface ShopStat {
  id: string; name: string; slug: string; ownerName: string | null;
  ownerPhone: string | null; phone: string | null; isActive: boolean;
  whatsapp: string | null; email: string | null; address: string | null;
  primaryColor: string | null; adminPin: string;
  trialDays: number | null; trialStartsAt: string | null;
  plan: string; features: string | null;
  paymentInfo: string | null; ownerNotes: string | null;
  orders: number; revenue: number; todayOrders: number;
  recentOrders: { id: string; reference: string; serviceName: string;
    status: string; total: number; customer: { name: string; phone: string };
    createdAt: string }[];
}

interface GlobalOrder {
  id: string; reference: string; serviceType: string; serviceName: string;
  status: string; total: number; pages: number; copies: number;
  customer: { name: string; phone: string };
  delivery: { method: string };
  createdAt: string; shopName: string; shopSlug: string; shopId?: string;
}

interface GlobalStats {
  totalOrders: number; totalRevenue: number; todayOrders: number;
  shopCount: number; activeShopCount: number;
  statusCounts: Record<string, number>;
  shopStats: ShopStat[];
  recentOrders: GlobalOrder[];
}

// ===== مساعدات عامة =====

// التحقق من الجلسة - صلاحية 24 ساعة
const SESSION_KEY = "sa_auth";
const SESSION_HOURS = 24;

function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    // صلاحية 24 ساعة
    if (Date.now() - ts > SESSION_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function markAuthenticated() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
}

// طلبات بسيطة بدون مفتاح (بعد التحقق من الجلسة)
function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, options);
}

// ===== مكوّن بوابة الدخول =====
function LoginGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isFirstSetup, setIsFirstSetup] = useState(false);

  // التحقق: هل هذه أول مرة (لم يتم تعيين كلمة مرور بعد)؟
  useEffect(() => {
    fetch("/api/super-admin/password")
      .then((r) => r.json())
      .then((d) => {
        const first = d.isDefault === true;
        setIsFirstSetup(first);
        setChecking(false);
        // أول مرة: دخول مباشر تلقائي بدون عرض بوابة
        if (first) {
          markAuthenticated();
          onUnlock();
          setTimeout(() => {
            toast.warning("أضف كلمة مرور", {
              description: "اذهب إلى الإعدادات ← الأمان والفريق وقم بتعيين كلمة مرور",
              duration: 8000,
            });
          }, 600);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    // أول مرة: دخول مباشر بدون كلمة مرور
    if (isFirstSetup) {
      markAuthenticated();
      onUnlock();
      setTimeout(() => {
        toast.warning("أضف كلمة مرور", {
          description: "اذهب إلى الإعدادات ← الأمان والفريق وقم بتعيين كلمة مرور",
          duration: 8000,
        });
      }, 500);
      return;
    }

    if (!password.trim() || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/super-admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        markAuthenticated();
        onUnlock();
      } else {
        setError(true);
        toast.error("كلمة المرور غير صحيحة");
      }
    } catch {
      setError(true);
      toast.error("خطأ في الاتصال");
    } finally {
      setVerifying(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <RefreshCw className="h-6 w-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  // بعد تعيين كلمة مرور: عرض حقل كلمة المرور
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-sm shadow-xl border-slate-200/60">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">مطبعة الذكي</h1>
            <p className="text-sm text-slate-400 mt-1">لوحة تحكم المدير الأول</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="كلمة المرور"
                className={cn("h-11 text-sm pe-10", error && "border-rose-300 focus-visible:ring-rose-500")}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
              disabled={verifying || !password.trim()}
            >
              {verifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : "دخول"}
            </Button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-4">
            🔒 هذا القسم مخصص للإدارة فقط
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function robustCopy(text: string, successMsg: string, successDesc: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast.success(successMsg, { description: successDesc });
      return;
    }
  } catch {
    // Fall through to fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      toast.success(successMsg, { description: successDesc });
    } else {
      throw new Error("execCommand failed");
    }
  } catch {
    toast.error("فشل نسخ النص", { description: "حاول مرة أخرى أو انسخ يدوياً" });
  }
}

function openInNewTab(url: string) {
  const w = window.open(url, "_blank");
  if (!w || w.closed) {
    window.location.href = url;
    toast.warning("تم فتح الرابط في نفس النافذة", { description: "قد يكون حظر النوافذ المنبثقة مفعّلاً في المتصفح" });
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("ar-DZ");
}

// ===== حالة الطلبات =====
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  printing: "bg-blue-50 text-blue-700 border-blue-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delivered: "bg-slate-50 text-slate-500 border-slate-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

// ===== عناوين التبويبات =====
const TAB_TITLES: Record<string, string> = {
  overview: "نظرة عامة",
  orders: "الطلبات",
  shops: "المتاجر",
  settings: "الإعدادات",
  security: "الأمان والفريق",
};



// ===== المكوّن الرئيسي =====
export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [allOrders, setAllOrders] = useState<GlobalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shopFilter, setShopFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        adminFetch("/api/admin/global-stats"),
        adminFetch("/api/orders"),
      ]);
      if (!statsRes.ok || !ordersRes.ok) {
        console.error("API error:", statsRes.status, ordersRes.status);
        return;
      }
      const stats = await statsRes.json();
      const orders = await ordersRes.json();
      setGlobalStats(stats);
      setAllOrders(orders.orders || []);
    } catch {
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  // التحقق من الجلسة المحفوظة
  useEffect(() => {
    setMounted(true);
    if (isAuthenticated()) setAuthenticated(true);
  }, []);

  // تحميل البيانات فقط بعد التحقق
  useEffect(() => {
    if (authenticated) loadAll();
  }, [authenticated, loadAll]);

  const filteredOrders = useMemo(() => {
    let list = allOrders;
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (shopFilter !== "all") list = list.filter((o) => o.shopSlug === shopFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.reference.toLowerCase().includes(q) ||
        o.customer.name.includes(q) ||
        o.customer.phone.includes(q) ||
        o.shopName.includes(q)
      );
    }
    return list;
  }, [allOrders, statusFilter, shopFilter, search]);

  async function copyLink(slug: string) {
    const baseUrl = window.location.origin;
    await robustCopy(`${baseUrl}/s/${slug}`, "تم نسخ رابط الزبائن", "شاركه مع زبائن المتجر");
  }

  async function copyAdminLink(slug: string) {
    const baseUrl = window.location.origin;
    await robustCopy(`${baseUrl}/s/${slug}?admin=1`, "تم نسخ رابط الإدارة", "أعطه لصاحب المتجر فقط");
  }

  const stats = globalStats;

  const sidebarSections = useMemo(() => [
    {
      title: "الرئيسية",
      items: [
        { key: "overview", label: "الرئيسية", icon: LayoutGrid },
        { key: "orders", label: "الطلبات", icon: Package, badge: stats?.totalOrders },
        { key: "shops", label: "المتاجر", icon: Store },
      ],
    },
    {
      title: "النظام",
      items: [
        { key: "settings", label: "الإعدادات", icon: Settings },
        { key: "security", label: "الأمان والفريق", icon: Lock },
      ],
    },
  ], [stats?.totalOrders]);

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  if (!authenticated) return <LoginGate onUnlock={() => setAuthenticated(true)} />;

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* الشريط الجانبي */}
      <DashboardSidebar
        sections={sidebarSections}
        activeKey={activeTab}
        onNavigate={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        logo={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-sm text-white truncate">مطبعة الذكي</div>
                <div className="text-[10px] text-slate-400 truncate">لوحة التحكم</div>
              </div>
            )}
          </div>
        }
      />

      {/* المحتوى الرئيسي */}
      <div className="flex-1 bg-slate-50 overflow-auto">
        {/* شريط الترويسة العلوي */}
        <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-30 px-4 sm:px-6">
          <div className="h-full flex items-center justify-between gap-3">
            {/* الجانب الأيمن: زر القائمة + العنوان */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:hidden"
                aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-800 truncate">{TAB_TITLES[activeTab] || "لوحة التحكم"}</h1>
                <p className="text-xs text-slate-400 truncate">لوحة التحكم / {TAB_TITLES[activeTab] || "نظرة عامة"}</p>
              </div>
            </div>
            {/* الجانب الأيسر: الأزرار */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCreateOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">إنشاء متجر</span>
              </button>
              <button
                onClick={loadAll}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2.5 text-sm transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        {/* المحتوى */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-slate-800 tabular-nums">{formatNumber(stats?.totalOrders ?? 0)}</div>
                  <div className="text-xs text-slate-400 mt-1">إجمالي الطلبات</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-50/80 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-slate-800 tabular-nums">{formatDA(stats?.totalRevenue ?? 0)}</div>
                  <div className="text-xs text-slate-400 mt-1">إجمالي الإيرادات</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50/80 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-slate-800 tabular-nums">{formatNumber(stats?.todayOrders ?? 0)}</div>
                  <div className="text-xs text-slate-400 mt-1">طلبات اليوم</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50/80 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-slate-800 tabular-nums">{formatNumber(stats?.activeShopCount ?? 0)}<span className="text-slate-300 text-lg font-normal">/{formatNumber(stats?.shopCount ?? 0)}</span></div>
                  <div className="text-xs text-slate-400 mt-1">متجر نشط</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-sky-50/80 flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ===== تبويب نظرة عامة ===== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* توزيع الحالات */}
              <Card className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                    توزيع حالات الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {STATUS_FLOW.map((s) => (
                    <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[s] || ""}`}>
                      <span>{STATUS_META[s].emoji}</span>
                      {STATUS_META[s].label}: {stats?.statusCounts?.[s] ?? 0}
                    </div>
                  ))}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS.cancelled || ""}`}>
                    <span>❌</span>
                    ملغي: {stats?.statusCounts.cancelled ?? 0}
                  </div>
                </CardContent>
              </Card>

              {/* ملخص المتاجر */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {stats?.shopStats.map((shop) => (
                  <ShopOverviewCard
                    key={shop.id}
                    shop={shop}
                    onRefresh={loadAll}
                  />
                ))}
              </div>

              {/* آخر الطلبات */}
              <Card className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <Clock className="h-4 w-4 text-violet-600" />
                    آخر الطلبات عبر المتاجر
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {stats?.recentOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 gap-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">{order.reference}</span>
                              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">{order.shopName}</span>
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {order.customer.name} · {order.serviceName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-slate-800">{formatDA(order.total)}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-lg ${STATUS_COLORS[order.status] || ""}`}>
                            {STATUS_META[order.status]?.label || order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!stats?.recentOrders.length) && (
                      <div className="py-10 text-center text-slate-400 text-sm">لا توجد طلبات بعد</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== تبويب جميع الطلبات ===== */}
          {activeTab === "orders" && (
            <div className="space-y-5">
              {/* شريط البحث والفلاتر */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-1">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث برقم الطلب، اسم، هاتف، أو متجر..."
                    className="pr-10 text-sm h-10 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
                  />
                </div>
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger className="text-sm h-10 rounded-lg border-slate-200 bg-white">
                    <SelectValue placeholder="كل المتاجر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المتاجر</SelectItem>
                    {stats?.shopStats.map((s) => (
                      <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm h-10 rounded-lg border-slate-200 bg-white">
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

              {/* ملخص */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>المعروض: <b className="text-slate-600">{filteredOrders.length}</b> من {allOrders.length}</span>
              </div>

              {/* جدول الطلبات - حاسوب */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-100">
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">رقم الطلب</TableHead>
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">المتجر</TableHead>
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">الخدمة</TableHead>
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">العميل</TableHead>
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">المجموع</TableHead>
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">الحالة</TableHead>
                      <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 100).map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50"
                        onClick={() => openInNewTab(`/s/${o.shopSlug || ""}?admin=1`)}
                      >
                        <TableCell className="font-mono text-xs font-bold text-slate-800">{o.reference}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs font-normal rounded-lg border-slate-200 text-slate-500 bg-slate-50">{o.shopName || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{o.serviceName}</TableCell>
                        <TableCell className="text-sm">
                          <div className="text-slate-700">{o.customer.name}</div>
                          <div className="text-slate-400" dir="ltr">{o.customer.phone}</div>
                        </TableCell>
                        <TableCell className="text-sm font-bold text-slate-800">{formatDA(o.total)}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2.5 py-1 rounded-lg ${STATUS_COLORS[o.status] || ""}`}>
                            {STATUS_META[o.status]?.label || o.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">{formatDateTimeAr(o.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredOrders.length === 0 && (
                  <div className="py-14 text-center text-slate-400 text-sm">لا توجد طلبات</div>
                )}
              </div>

              {/* بطاقات الطلبات - جوال */}
              <div className="md:hidden space-y-3">
                {filteredOrders.slice(0, 50).map((o) => (
                  <div
                    key={o.id}
                    className="cursor-pointer bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow"
                    onClick={() => openInNewTab(`/s/${o.shopSlug || ""}?admin=1`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">{o.reference}</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">{o.shopName}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{o.serviceName} · {o.customer.name}</div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold text-slate-800">{formatDA(o.total)}</div>
                        <span className={`text-xs px-2.5 py-1 rounded-lg ${STATUS_COLORS[o.status] || ""}`}>
                          {STATUS_META[o.status]?.label || o.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && (
                  <div className="py-14 text-center text-slate-400 text-sm">لا توجد طلبات</div>
                )}
              </div>
            </div>
          )}

          {/* ===== تبويب المتاجر ===== */}
          {activeTab === "shops" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm text-slate-400">{stats?.shopCount ?? 0} متجر</div>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء متجر جديد
                </button>
              </div>

              {loading ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-violet-500" />
                  جارٍ التحميل...
                </div>
              ) : (stats?.shopStats.length ?? 0) === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                      <Store className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-700 mb-2">لا توجد متاجر بعد</p>
                    <p className="text-xs text-slate-400 mb-4">ابدأ بإنشاء متجرك الأول</p>
                    <button
                      onClick={() => setCreateOpen(true)}
                      className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> إنشاء متجر
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.shopStats.map((shop) => (
                    <ShopManageCard
                      key={shop.id}
                      shop={shop}
                      onCopyLink={copyLink}
                      onCopyAdminLink={copyAdminLink}
                      onRefresh={loadAll}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== تبويب الإعدادات ===== */}
          {activeTab === "settings" && (
            <SettingsTab />
          )}
          {activeTab === "security" && (
            <SecurityTab />
          )}
        </div>
      </div>

      {/* نافذة إنشاء متجر */}
      <CreateShopDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={loadAll} />
    </div>
  );
}

// ===== زر نسخ مع تأكيد بصري =====
function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await robustCopy(text, `تم نسخ ${label}`, "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      className={
        "shrink-0 border rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 " +
        (copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-600"
          : "border-slate-200 text-slate-700 hover:bg-slate-50" +
            (className ? " " + className : ""))
      }
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "تم!" : label}
    </button>
  );
}

// ===== بطاقة متجر في نظرة عامة =====
function ShopOverviewCard({ shop, onRefresh }: {
  shop: ShopStat;
  onRefresh: () => void;
}) {
  return (
    <Card className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow overflow-hidden">
      <div className="h-1 bg-violet-600" />
      <CardHeader className="pb-2 px-5 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate text-slate-800">{shop.name}</CardTitle>
              <div className="text-xs text-slate-400 truncate">
                {shop.ownerName || "—"} · {shop.ownerPhone || shop.phone || "—"}
              </div>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-lg shrink-0 font-medium ${
            shop.isActive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          }`}>
            {shop.isActive ? "نشط" : "متوقف"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-lg font-bold text-slate-800">{shop.orders}</div>
            <div className="text-xs text-slate-400">طلبات</div>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-3">
            <div className="text-lg font-bold text-emerald-600">{formatDA(shop.revenue)}</div>
            <div className="text-xs text-slate-400">إيرادات</div>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3">
            <div className="text-lg font-bold text-amber-600">{shop.todayOrders}</div>
            <div className="text-xs text-slate-400">اليوم</div>
          </div>
        </div>

        {shop.recentOrders.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">آخر الطلبات:</div>
            {shop.recentOrders.slice(0, 3).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-xs bg-slate-50/80 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-slate-700">{o.reference}</span>
                  <span className="text-slate-400 truncate">{o.customer.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-800">{formatDA(o.total)}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs ${STATUS_COLORS[o.status] || ""}`}>
                    {STATUS_META[o.status]?.label || o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <CopyButton text={`${window.location.origin}/s/${shop.slug}`} label="رابط الزبون" />
          <CopyButton text={`${window.location.origin}/s/${shop.slug}?admin=1`} label="رابط الإدارة" />
          <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => openInNewTab(`/s/${shop.slug}?admin=1`)}>
            <ExternalLink className="h-3.5 w-3.5" /> فتح الإدارة
          </button>
          <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => openInNewTab(`/s/${shop.slug}?preview=1`)}>
            <Eye className="h-3.5 w-3.5" /> معاينة زبون
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== حساب حالة التجربة =====
function getTrialInfo(shop: ShopStat): { label: string; color: string; daysLeft: number | null } {
  if (!shop.trialDays || !shop.trialStartsAt) {
    return { label: "بلا حدود", color: "bg-emerald-50 text-emerald-600", daysLeft: null };
  }
  const start = new Date(shop.trialStartsAt);
  const end = new Date(start.getTime() + shop.trialDays * 86400000);
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (daysLeft <= 0) {
    return { label: "انتهت", color: "bg-rose-50 text-rose-600", daysLeft: 0 };
  }
  if (daysLeft <= 3) {
    return { label: `${daysLeft} يوم متبقي`, color: "bg-amber-50 text-amber-600", daysLeft };
  }
  return { label: `${daysLeft} يوم متبقي`, color: "bg-blue-50 text-blue-600", daysLeft };
}

// ===== بطاقة إدارة متجر =====
function ShopManageCard({ shop, onCopyLink, onCopyAdminLink, onRefresh }: {
  shop: ShopStat;
  onCopyLink: (slug: string) => void;
  onCopyAdminLink: (slug: string) => void;
  onRefresh: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const trial = getTrialInfo(shop);
  const parsedFeatures = parseFeatures(shop.features, shop.plan);
  const enabledCount = countEnabledFeatures(parsedFeatures);
  const isPaid = shop.plan === "paid";

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await adminFetch(`/api/admin/shops/${shop.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !shop.isActive }),
      });
      if (!res.ok) throw new Error("فشل");
      toast.success(shop.isActive ? `تم تعطيل "${shop.name}"` : `تم تفعيل "${shop.name}"`);
      onRefresh();
    } catch {
      toast.error("فشل التحديث");
    } finally {
      setToggling(false);
    }
  }

  async function deleteShop() {
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/shops/${shop.slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل");
      toast.success(`تم حذف "${shop.name}"`);
      onRefresh();
    } catch {
      toast.error("فشل الحذف");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <Card className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow overflow-hidden">
      {/* شريط لون المتجر في الأعلى */}
      <div
        className="h-1.5"
        style={{ background: shop.primaryColor ? `linear-gradient(to left, ${shop.primaryColor}, ${shop.primaryColor}cc)` : "linear-gradient(to left, #7c3aed, #6d28d9)" }}
      />
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5">
          {/* السطر الأول: اسم المتجر + الحالة + التجربة */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate text-slate-800">{shop.name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {shop.ownerName && `${shop.ownerName} · `}
                  {shop.orders} طلب · {formatDA(shop.revenue)} دج
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                shop.isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}>
                {shop.isActive ? "نشط" : "متوقف"}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                isPaid
                  ? "bg-violet-50 text-violet-600"
                  : "bg-slate-50 text-slate-500"
              }`}>
                {isPaid ? "✦ مدفوع" : "مجاني"}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${trial.color}`}>
                <Timer className="h-3 w-3 inline-block ml-0.5 -mt-px" />
                {trial.label}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                shop.paymentInfo
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-50 text-slate-400"
              }`}>
                {shop.paymentInfo ? "✓ مدفوع" : "غير مدفوع"}
              </span>
            </div>
          </div>

          {/* السطر الثاني: أزرار الإدارة + عدد الميزات */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> إعدادات
              </button>
              <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={toggleActive} disabled={toggling}>
                {shop.isActive ? <><EyeOff className="h-3.5 w-3.5" /> تعطيل</> : <><Eye className="h-3.5 w-3.5" /> تفعيل</>}
              </button>
              <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => onCopyLink(shop.slug)}>
                <Copy className="h-3.5 w-3.5" /> رابط الزبون
              </button>
              <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => onCopyAdminLink(shop.slug)}>
                <Copy className="h-3.5 w-3.5" /> رابط الإدارة
              </button>
              <button className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => openInNewTab(`/s/${shop.slug}?admin=1`)}>
                <ExternalLink className="h-3.5 w-3.5" /> فتح الإدارة
              </button>
              <button className="border border-violet-200 text-violet-600 hover:bg-violet-50 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" onClick={() => openInNewTab(`/s/${shop.slug}`)}>
                <Eye className="h-3.5 w-3.5" /> معاينة
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5" disabled={deleting}>
                    <Trash2 className="h-3.5 w-3.5" /> {deleting ? "جارٍ الحذف..." : "حذف"}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl" className="rounded-xl shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف متجر &quot;{shop.name}&quot;؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف المتجر وجميع طلباته نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-lg">إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteShop} className="bg-red-600 hover:bg-red-700 rounded-lg">تأكيد الحذف</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              <ToggleLeft className="h-3 w-3 inline-block ml-0.5 -mt-px" />
              {enabledCount}/{TOTAL_FEATURES} ميزة
            </span>
          </div>
        </div>
      </CardContent>
    </Card>

    <EditShopDialog
      shop={shop}
      open={editOpen}
      onClose={() => setEditOpen(false)}
      onSaved={onRefresh}
    />
    </>
  );
}

// ===== نافذة تعديل متجر =====
function EditShopDialog({ shop, open, onClose, onSaved }: {
  shop: ShopStat;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(shop.plan || "free");
  const [features, setFeatures] = useState<ShopFeatures>(() => parseFeatures(shop.features, shop.plan));
  const [paymentInfo, setPaymentInfo] = useState(shop.paymentInfo || "");
  const [ownerNotes, setOwnerNotes] = useState(shop.ownerNotes || "");
  const [form, setForm] = useState({
    name: shop.name,
    phone: shop.phone || "",
    whatsapp: shop.whatsapp || "",
    email: shop.email || "",
    address: shop.address || "",
    ownerName: shop.ownerName || "",
    ownerPhone: shop.ownerPhone || "",
    adminPin: shop.adminPin || "",
    primaryColor: shop.primaryColor || "",
    trialDays: shop.trialDays ?? "",
    trialStartsAt: shop.trialStartsAt ? shop.trialStartsAt.slice(0, 10) : "",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const enabledCount = countEnabledFeatures(features);
  const isPaidPlan = plan === "paid";

  // ===== حالة التجربة / الخطة =====
  const trialStatus = useMemo(() => {
    if (plan === "paid") return { type: "paid" as const, label: "مدفوع - دائم", daysLeft: 0 };
    const days = Number(form.trialDays);
    const start = form.trialStartsAt;
    if (!days || !start) return { type: "free" as const, label: "مجاني", daysLeft: 0 };
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + days * 86400000);
    const diffMs = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / 86400000);
    if (daysLeft > 0) return { type: "trial" as const, label: `تجربة - ${daysLeft} يوم متبقي`, daysLeft };
    return { type: "expired" as const, label: "انتهت التجربة", daysLeft: 0 };
  }, [plan, form.trialDays, form.trialStartsAt]);

  const STATUS_BADGE_STYLE: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    trial: "bg-amber-50 text-amber-700 border-amber-200",
    expired: "bg-rose-50 text-rose-700 border-rose-200",
    free: "bg-slate-50 text-slate-500 border-slate-200",
  };

  function toggleFeature(key: FeatureKey) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function enableAllForGroup(groupFeatures: typeof FEATURE_DEFINITIONS) {
    const updated = { ...features };
    groupFeatures.forEach((f) => { updated[f.key] = true; });
    setFeatures(updated);
  }

  function disableAllForGroup(groupFeatures: typeof FEATURE_DEFINITIONS) {
    const updated = { ...features };
    groupFeatures.forEach((f) => { updated[f.key] = false; });
    setFeatures(updated);
  }

  function enableAllFeatures() {
    const all: ShopFeatures = {};
    FEATURE_DEFINITIONS.forEach((f) => { all[f.key] = true; });
    setFeatures(all);
  }

  function disableAllFeatures() {
    const all: ShopFeatures = {};
    FEATURE_DEFINITIONS.forEach((f) => { all[f.key] = false; });
    setFeatures(all);
    setPlan("free");
  }

  function quickAction(mode: "permanent" | "trial15" | "trial30") {
    enableAllFeatures();
    if (mode === "permanent") {
      setPlan("paid");
      setForm((prev) => ({ ...prev, trialDays: "", trialStartsAt: "" }));
    } else {
      setPlan("free");
      const days = mode === "trial15" ? 15 : 30;
      const today = new Date().toISOString().slice(0, 10);
      setForm((prev) => ({ ...prev, trialDays: String(days), trialStartsAt: today }));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        ownerName: form.ownerName || null,
        ownerPhone: form.ownerPhone || null,
        adminPin: form.adminPin,
        primaryColor: form.primaryColor || null,
        trialDays: form.trialDays ? Number(form.trialDays) : "",
        trialStartsAt: form.trialStartsAt || null,
        plan,
        features,
        paymentInfo: paymentInfo || null,
        ownerNotes: ownerNotes || null,
      };

      const res = await adminFetch(`/api/admin/shops/${shop.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "فشل التحديث");
      }
      toast.success(`تم تحديث "${form.name}"`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error("فشل التحديث", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-4 sm:p-6" dir="rtl">
        <DialogTitle className="flex items-center justify-between">
          <span className="text-slate-800">إعدادات متجر &quot;{shop.name}&quot;</span>
          <Badge variant="outline" className={`text-xs font-semibold rounded-lg ${STATUS_BADGE_STYLE[trialStatus.type]}`}>
            {trialStatus.type === "paid" && <Infinity className="h-3 w-3 ml-1 inline" />}
            {trialStatus.type === "trial" && <Timer className="h-3 w-3 ml-1 inline" />}
            {trialStatus.type === "expired" && <XCircle className="h-3 w-3 ml-1 inline" />}
            {trialStatus.label}
          </Badge>
        </DialogTitle>

        <form onSubmit={handleSave} className="space-y-6 mt-2">
          {/* معلومات المتجر */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-violet-500 pr-3">
              <Store className="h-4 w-4 text-violet-600" /> معلومات المتجر
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-slate-600">اسم المتجر</Label>
                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" required />
              </div>
              <div>
                <Label className="text-slate-600">هاتف المتجر</Label>
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" placeholder="05XX..." />
              </div>
              <div>
                <Label className="text-slate-600">واتساب</Label>
                <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" placeholder="05XX..." />
              </div>
              <div>
                <Label className="text-slate-600">البريد الإلكتروني</Label>
                <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" type="email" />
              </div>
              <div>
                <Label className="text-slate-600">العنوان</Label>
                <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" />
              </div>
            </div>
          </div>

          {/* معلومات صاحب المتجر */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-emerald-400 pr-3">
              <Users className="h-4 w-4 text-emerald-500" /> بيانات العميل (صاحب المتجر)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">اسم العميل</Label>
                <Input value={form.ownerName} onChange={(e) => updateField("ownerName", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" />
              </div>
              <div>
                <Label className="text-slate-600">هاتف العميل</Label>
                <Input value={form.ownerPhone} onChange={(e) => updateField("ownerPhone", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" placeholder="05XX..." />
              </div>
            </div>
          </div>

          {/* الأمان */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-rose-400 pr-3">
              <Lock className="h-4 w-4 text-rose-500" /> الأمان
            </h4>
            <div>
              <Label className="text-slate-600">كلمة مرور الإدارة</Label>
              <Input value={form.adminPin} onChange={(e) => updateField("adminPin", e.target.value)} className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" required />
              <p className="text-xs text-slate-400 mt-1.5">أرسل هذه الكلمة للعميل مع رابط الإدارة</p>
            </div>
          </div>

          {/* المظهر */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-violet-400 pr-3">
              <Settings className="h-4 w-4 text-violet-500" /> المظهر
            </h4>
            <div>
              <Label className="text-slate-600">اللون الرئيسي</Label>
              <div className="flex gap-3 mt-1.5">
                <Input value={form.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} className="flex-1 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" placeholder="#7c3aed" />
                {form.primaryColor && (
                  <div className="w-10 h-10 rounded-lg border border-slate-200 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" style={{ backgroundColor: form.primaryColor }} />
                )}
              </div>
            </div>
          </div>

          {/* فترة التجربة + إجراءات سريعة */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-violet-400 pr-3">
              <CalendarDays className="h-4 w-4 text-violet-600" /> فترة التجربة والمدة
            </h4>

            {/* إجراءات سريعة */}
            <div className="space-y-3 bg-slate-50/60 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <span className="text-sm font-bold text-slate-700">إجراءات سريعة</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="text-xs h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors inline-flex items-center justify-center gap-1.5"
                  onClick={() => quickAction("permanent")}
                >
                  <Infinity className="h-3.5 w-3.5 ml-1.5" />
                  فتح كل الميزات (دائم)
                </button>
                <button
                  type="button"
                  className="text-xs h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors inline-flex items-center justify-center gap-1.5"
                  onClick={() => quickAction("trial15")}
                >
                  <Timer className="h-3.5 w-3.5 ml-1.5" />
                  فتح كل الميزات (15 يوم)
                </button>
                <button
                  type="button"
                  className="text-xs h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors inline-flex items-center justify-center gap-1.5"
                  onClick={() => quickAction("trial30")}
                >
                  <Timer className="h-3.5 w-3.5 ml-1.5" />
                  فتح كل الميزات (30 يوم)
                </button>
                <button
                  type="button"
                  className="text-xs h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors inline-flex items-center justify-center gap-1.5"
                  onClick={disableAllFeatures}
                >
                  <XCircle className="h-3.5 w-3.5 ml-1.5" />
                  إغلاق كل الميزات
                </button>
              </div>
            </div>

            {/* حقول التجربة اليدوية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">مدة التجربة (أيام)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.trialDays}
                  onChange={(e) => updateField("trialDays", e.target.value)}
                  className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500"
                  dir="ltr"
                  placeholder="اتركه فارغاً = بلا حدود"
                />
              </div>
              <div>
                <Label className="text-slate-600">تاريخ البداية</Label>
                <Input
                  type="date"
                  value={form.trialStartsAt}
                  onChange={(e) => updateField("trialStartsAt", e.target.value)}
                  className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500"
                  dir="ltr"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  {form.trialStartsAt ? "" : "سيُحدد تلقائياً عند الحفظ"}
                </p>
              </div>
            </div>
            {form.trialDays && trialStatus.type === "trial" && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-4 text-xs text-amber-700">
                ⏰ متبقي <strong>{trialStatus.daysLeft} يوم</strong> على انتهاء فترة التجربة
              </div>
            )}
            {trialStatus.type === "expired" && (
              <div className="bg-rose-50 border border-rose-200/80 rounded-lg p-4 text-xs text-rose-700">
                ⛔ انتهت فترة التجربة — المتجر لا يستطيع استخدام الميزات المدفوعة
              </div>
            )}
          </div>

          <Separator className="bg-slate-100" />

          {/* الخطة */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-violet-400 pr-3">
              <CreditCard className="h-4 w-4 text-violet-600" /> الخطة
            </h4>
            <div>
              <Label className="text-slate-600">نوع الخطة</Label>
              <Select value={plan} onValueChange={(v) => {
                setPlan(v);
                if (v === "paid") {
                  const all: ShopFeatures = {};
                  FEATURE_DEFINITIONS.forEach((f) => { all[f.key] = true; });
                  setFeatures(all);
                }
              }}>
                <SelectTrigger className="mt-1.5 rounded-lg border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">مجاني</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isPaidPlan && (
              <div className="bg-violet-50 border border-violet-200/80 rounded-lg p-4 text-xs text-violet-700">
                ✅ الخطة المدفوعة: جميع الميزات مفعّلة تلقائياً. يمكنك تعطيل ميزة معينة يدوياً إذا أردت.
              </div>
            )}
            <div>
              <Label className="text-slate-600">معلومات الدفع</Label>
              <Textarea
                value={paymentInfo}
                onChange={(e) => setPaymentInfo(e.target.value)}
                className="mt-1.5 text-xs rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500"
                rows={3}
                placeholder="طريقة الدفع، المبلغ، التاريخ..."
              />
            </div>
            <div>
              <Label className="text-slate-600">ملاحظات المالك</Label>
              <Textarea
                value={ownerNotes}
                onChange={(e) => setOwnerNotes(e.target.value)}
                className="mt-1.5 text-xs rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500"
                rows={3}
                placeholder="ملاحظات خاصة عن هذا المتجر..."
              />
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* إدارة الميزات */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700 border-r-2 border-violet-400 pr-3">
                <ToggleLeft className="h-4 w-4 text-violet-600" /> إدارة الميزات
              </h4>
              <Badge variant="outline" className="text-xs rounded-lg border-slate-200 text-slate-500">
                {enabledCount}/{TOTAL_FEATURES} مفعّلة
              </Badge>
            </div>

            {isPaidPlan && (
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200/80 rounded-lg p-3">
                الخطة المدفوعة — جميع الميزات مفعّلة افتراضياً
              </div>
            )}

            {/* ميزات واجهة الزبون */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600">ميزات واجهة الزبون ({CUSTOMER_FEATURES.length})</span>
                <div className="flex gap-1">
                  <button type="button" className="text-xs h-7 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" onClick={() => enableAllForGroup(CUSTOMER_FEATURES)}>
                    تفعيل الكل
                  </button>
                  <button type="button" className="text-xs h-7 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => disableAllForGroup(CUSTOMER_FEATURES)}>
                    تعطيل الكل
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                {CUSTOMER_FEATURES.map((f) => (
                  <label key={f.key} className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-white/80 transition-colors">
                    <Checkbox
                      checked={features[f.key] === true}
                      onCheckedChange={() => toggleFeature(f.key)}
                      className="mt-0.5 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700">{f.label}</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{f.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ميزات لوحة التاجر */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600">ميزات لوحة التاجر ({MERCHANT_FEATURES.length})</span>
                <div className="flex gap-1">
                  <button type="button" className="text-xs h-7 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" onClick={() => enableAllForGroup(MERCHANT_FEATURES)}>
                    تفعيل الكل
                  </button>
                  <button type="button" className="text-xs h-7 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => disableAllForGroup(MERCHANT_FEATURES)}>
                    تعطيل الكل
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                {MERCHANT_FEATURES.map((f) => (
                  <label key={f.key} className="flex items-start gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-white/80 transition-colors">
                    <Checkbox
                      checked={features[f.key] === true}
                      onCheckedChange={() => toggleFeature(f.key)}
                      className="mt-0.5 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700">{f.label}</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{f.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* أزرار الحفظ */}
          <div className="flex gap-3 pt-3">
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
            <button type="button" onClick={onClose} className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== تبويب الإعدادات العامة =====
function SettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [services, setServices] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState("");
  const [general, setGeneral] = useState("");

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("فشل");
      const data = await res.json();
      setServices(JSON.stringify(data.services || {}, null, 2));
      setDeliveryOptions(JSON.stringify(data.deliveryOptions || {}, null, 2));
      setGeneral(JSON.stringify(data.general || {}, null, 2));
    } catch {
      toast.error("خطأ في تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []);

  async function saveSection(section: string, value: string) {
    setSaving(section);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        toast.error("JSON غير صالح");
        return;
      }
      const body: Record<string, unknown> = {};
      if (section === "services") body.services = parsed;
      else if (section === "deliveryOptions") body.deliveryOptions = parsed;
      else if (section === "general") body.general = parsed;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("فشل");
      toast.success("تم حفظ الإعدادات");
    } catch {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-5 pb-4">
          <h3 className="text-sm flex items-center gap-2 text-slate-700 font-semibold">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Settings className="h-4 w-4 text-violet-600" />
            </div>
            إعدادات النظام العامة
          </h3>
        </div>
        <div className="px-5 pb-5 space-y-6">
          <p className="text-xs text-slate-400">
            هذه الإعدادات تُطبّق كقيم افتراضية عند إنشاء متجر جديد. عدّل JSON وحفظ.
          </p>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-violet-500" />
              جارٍ التحميل...
            </div>
          ) : (
            <>
              {/* الخدمات */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700">الخدمات (services)</Label>
                  <button
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    onClick={() => saveSection("services", services)}
                    disabled={saving === "services"}
                  >
                    {saving === "services" ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                </div>
                <Textarea
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  className="font-mono text-xs min-h-[160px] rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50"
                  dir="ltr"
                />
              </div>

              <Separator className="bg-slate-100" />

              {/* خيارات التوصيل */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700">خيارات التوصيل (deliveryOptions)</Label>
                  <button
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    onClick={() => saveSection("deliveryOptions", deliveryOptions)}
                    disabled={saving === "deliveryOptions"}
                  >
                    {saving === "deliveryOptions" ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                </div>
                <Textarea
                  value={deliveryOptions}
                  onChange={(e) => setDeliveryOptions(e.target.value)}
                  className="font-mono text-xs min-h-[120px] rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50"
                  dir="ltr"
                />
              </div>

              <Separator className="bg-slate-100" />

              {/* إعدادات عامة */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700">إعدادات عامة (general)</Label>
                  <button
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    onClick={() => saveSection("general", general)}
                    disabled={saving === "general"}
                  >
                    {saving === "general" ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                </div>
                <Textarea
                  value={general}
                  onChange={(e) => setGeneral(e.target.value)}
                  className="font-mono text-xs min-h-[120px] rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50"
                  dir="ltr"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== تبويب الأمان والفريق =====
interface TeamMember {
  email: string;
  name: string;
  role: string;
  addedAt: string;
}

function SecurityTab() {
  // كلمة المرور
  const [isDefaultPwd, setIsDefaultPwd] = useState(true);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // الفريق
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [addingMember, setAddingMember] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    // تحقق من حالة كلمة المرور
    fetch("/api/super-admin/password")
      .then((r) => r.json())
      .then((d) => setIsDefaultPwd(d.isDefault ?? true))
      .catch(() => {});

    // تحميل أعضاء الفريق
    fetch("/api/super-admin/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoadingTeam(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPwd || newPwd !== confirmPwd) {
      if (newPwd !== confirmPwd) toast.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    setChangingPwd(true);
    try {
      const res = await fetch("/api/super-admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: isDefaultPwd ? undefined : currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isDefaultPwd ? "تم تعيين كلمة المرور بنجاح ✅" : "تم تغيير كلمة المرور بنجاح");
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
        setIsDefaultPwd(false);
      } else {
        toast.error(data.error || "فشل تغيير كلمة المرور");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setChangingPwd(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newName) return;
    setAddingMember(true);
    try {
      const res = await fetch("/api/super-admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تمت إضافة العضو", { description: newEmail });
        setMembers(data.members || []);
        setNewEmail(""); setNewName(""); setNewRole("member");
      } else {
        toast.error(data.error || "فشل الإضافة");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(email: string) {
    try {
      const res = await fetch("/api/super-admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم حذف العضو");
        setMembers(data.members || []);
      } else {
        toast.error(data.error || "فشل الحذف");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    }
  }

  function handleLogout() {
    localStorage.removeItem("sa_auth");
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      {/* ===== بطاقة كلمة المرور ===== */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm flex items-center gap-2 text-slate-700 font-semibold">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Lock className="h-4 w-4 text-violet-600" />
              </div>
              كلمة مرور لوحة التحكم
            </h3>
            {isDefaultPwd && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                ⚠️ يجب تعيين كلمة مرور
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 mr-10">
            غيّر كلمة المرور بشكل دوري لحماية لوحة التحكم
          </p>
        </div>
        <div className="px-5 pb-5">
          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            {!isDefaultPwd && (
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">كلمة المرور الحالية</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  className="h-10 text-sm pe-10 rounded-lg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            )}
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="4 أحرف على الأقل"
                  className="h-10 text-sm pe-10 rounded-lg"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">تأكيد كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className="h-10 text-sm rounded-lg"
                required
                minLength={4}
              />
              {confirmPwd && newPwd !== confirmPwd && (
                <p className="text-xs text-rose-500 mt-1">كلمة المرور غير متطابقة</p>
              )}
            </div>
            <Button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-10 px-5"
              disabled={changingPwd || (!isDefaultPwd && !currentPwd) || !newPwd || newPwd !== confirmPwd}
            >
              {changingPwd ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="mr-1.5">تغيير كلمة المرور</span>
            </Button>
          </form>
        </div>
      </div>

      {/* ===== بطاقة أعضاء الفريق ===== */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-5 pb-4">
          <h3 className="text-sm flex items-center gap-2 text-slate-700 font-semibold">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            فريق العمل
          </h3>
          <p className="text-xs text-slate-400 mt-1 mr-10">
            أضف أعضاء فريقك بالإيميل ليتمكنوا من الوصول والتعديل
          </p>
        </div>
        <div className="px-5 pb-5 space-y-4">
          {/* نموذج الإضافة */}
          <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="الاسم الكامل"
                className="h-10 text-sm rounded-lg"
                required
              />
            </div>
            <div className="flex-1">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                className="h-10 text-sm rounded-lg"
                dir="ltr"
                required
              />
            </div>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="h-10 text-sm rounded-lg w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير</SelectItem>
                <SelectItem value="member">عضو</SelectItem>
                <SelectItem value="viewer">مشاهد</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10 px-4 shrink-0"
              disabled={addingMember || !newEmail || !newName}
            >
              {addingMember ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span className="mr-1.5 hidden sm:inline">إضافة</span>
            </Button>
          </form>

          {/* قائمة الأعضاء */}
          {loadingTeam ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              جارٍ التحميل...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              لا يوجد أعضاء في الفريق بعد
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map((m) => (
                <div
                  key={m.email}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-violet-700">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{m.name}</div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-1" dir="ltr">
                        <Mail className="h-3 w-3 shrink-0" />
                        {m.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={cn(
                        "text-xs",
                        m.role === "admin" ? "bg-violet-50 text-violet-700 border-violet-200" :
                        m.role === "viewer" ? "bg-slate-100 text-slate-600 border-slate-200" :
                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {m.role === "admin" ? "مدير" : m.role === "viewer" ? "مشاهد" : "عضو"}
                    </Badge>
                    <button
                      onClick={() => handleRemoveMember(m.email)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== تسجيل الخروج ===== */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm flex items-center gap-2 text-slate-700 font-semibold">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-rose-600" />
              </div>
              الجلسة الحالية
            </h3>
            <p className="text-xs text-slate-400 mt-1 mr-10">تسجيل الخروج من لوحة التحكم</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg h-10 px-4"
          >
            <LogOut className="h-4 w-4" />
            <span className="mr-1.5">تسجيل الخروج</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== نافذة إنشاء متجر =====
function CreateShopDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [trialDays, setTrialDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdPin, setCreatedPin] = useState("");
  const [createdName, setCreatedName] = useState("");

  // إظهار شاشة النجاح بعد الإنشاء
  const showSuccess = !!createdSlug;

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\u0600-\u06FF]/g, (m) => {
        const map: Record<string, string> = {
          "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
          "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s",
          "ض": "dh", "ط": "t", "ظ": "dh", "ع": "a", "غ": "gh", "ف": "f", "ق": "k",
          "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y",
        };
        return map[m] || "";
      })
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleClose() {
    setCreatedSlug(""); setCreatedPin(""); setCreatedName("");
    setName(""); setSlug(""); setAdminPin(""); setOwnerName(""); setOwnerPhone(""); setTrialDays("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug || !adminPin) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, adminPin, ownerName, ownerPhone, trialDays: trialDays ? Number(trialDays) : undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "فشل الإنشاء");
      }
      // عرض شاشة النجاح مع الروابط
      setCreatedSlug(slug);
      setCreatedPin(adminPin);
      setCreatedName(name);
      onCreated();
    } catch (err) {
      toast.error("فشل إنشاء المتجر", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const customerLink = `${baseUrl}/s/${createdSlug}`;
  const adminLink = `${customerLink}?admin=1`;

  async function copyText(text: string, label: string) {
    await robustCopy(text, `تم نسخ ${label}`, "");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md rounded-xl shadow-2xl p-0 gap-0 overflow-hidden bg-white" dir="rtl">

        {showSuccess ? (
          /* ===== شاشة النجاح مع الروابط ===== */
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500 flex items-center justify-center mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">تم إنشاء المتجر بنجاح!</h2>
              <p className="text-sm text-slate-400 mt-1">{createdName}</p>
            </div>

            {/* رابط الزبائن */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Link2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                رابط الزبائن (أعطه للعميل)
              </div>
              <div className="flex gap-2">
                <Input value={customerLink} readOnly className="flex-1 bg-slate-50 text-xs rounded-lg border-slate-200" dir="ltr" onClick={(e) => (e.target as HTMLInputElement).select()} />
                <CopyButton text={customerLink} label="نسخ" className="px-2 py-2" />
              </div>
              <p className="text-xs text-slate-400">🔗 أرسل هذا الرابط للعميل ليشاركه مع زبائنه</p>
            </div>

            {/* رابط الإدارة */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Lock className="h-3.5 w-3.5 text-violet-600" />
                </div>
                رابط الإدارة + كلمة المرور
              </div>
              <div className="flex gap-2">
                <Input value={adminLink} readOnly className="flex-1 bg-slate-50 text-xs rounded-lg border-slate-200" dir="ltr" onClick={(e) => (e.target as HTMLInputElement).select()} />
                <CopyButton text={adminLink} label="نسخ" className="px-2 py-2" />
              </div>
              <div className="bg-violet-50 border border-violet-200/80 rounded-lg p-4">
                <div className="text-xs font-bold text-violet-700 mb-2">كلمة مرور الإدارة:</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-mono font-bold text-violet-800 tracking-widest" dir="ltr">{createdPin}</span>
                  <CopyButton text={createdPin} label="نسخ" className="border-violet-200 text-violet-600 hover:bg-violet-100" />
                </div>
              </div>
              <p className="text-xs text-slate-400">🔒 أرسل رابط الإدارة + كلمة المرور للعميل فقط</p>
            </div>

            {/* تعليمات واضحة */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2.5 border border-slate-100">
              <h4 className="font-bold text-sm text-slate-700">📌 ماذا تفعل الآن؟</h4>
              <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                <li>أرسل <strong className="text-slate-600">رابط الزبائن</strong> للعميل ليشاركه مع زبائنه</li>
                <li>أرسل <strong className="text-slate-600">رابط الإدارة + كلمة المرور</strong> للعميل لإدارة متجره</li>
                <li>العميل يفتح رابط الإدارة ويدخل كلمة المرور</li>
                <li>من هناك يستطيع تعديل متجره ومتابعة طلبات زبائنه</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={handleClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                تم، أغلق
              </button>
              <button onClick={() => openInNewTab(adminLink)} className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4" />
                فتح الإدارة
              </button>
            </div>
          </div>
        ) : (
          /* ===== نموذج الإنشاء ===== */
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-800">إنشاء متجر جديد</h2>
                <p className="text-xs text-slate-400">سيحصل العميل على رابطين: واحد للزبائن وآخر للإدارة</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-600">اسم المتجر *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="مثال: مطبعة النور" className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" required />
              </div>
              <div>
                <Label className="text-slate-600">المعرّف (الرابط) *</Label>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-2.5 rounded-r-lg border border-r-0 border-slate-200 whitespace-nowrap font-mono">/s/</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))} placeholder="matbaa-alnoor" className="rounded-l-lg rounded-r-none border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" required />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">سيكون الرابط: {baseUrl}/s/{slug || "..."}</p>
              </div>
              <div>
                <Label className="text-slate-600">كلمة مرور الإدارة *</Label>
                <Input type="text" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} placeholder="4 أرقام على الأقل" className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" required dir="ltr" />
                <p className="text-xs text-slate-400 mt-1.5">سيتم إرسالها للعميل مع رابط الإدارة</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-600">اسم العميل</Label>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="الاسم" className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" />
                </div>
                <div>
                  <Label className="text-slate-600">هاتف العميل</Label>
                  <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="05XX XX XX XX" className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" />
                </div>
              </div>
              <div>
                <Label className="text-slate-600">مدة التجربة المجانية (أيام)</Label>
                <Input type="number" min="0" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} placeholder="اتركه فارغاً = بلا حدود" className="mt-1.5 rounded-lg border-slate-200 focus:ring-violet-500/20 focus:border-violet-500" dir="ltr" />
                {trialDays && (
                  <p className="text-xs text-amber-600 mt-1.5">⏰ ستبدأ التجربة تلقائياً من الآن لمدة {trialDays} يوم</p>
                )}
              </div>
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors h-11" disabled={submitting}>
                {submitting ? "جارٍ الإنشاء..." : "إنشاء المتجر"}
              </button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}