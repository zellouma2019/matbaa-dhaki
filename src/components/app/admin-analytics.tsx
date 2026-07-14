"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Users,
  DollarSign,
  Package,
  RefreshCw,
  Inbox,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { STATUS_META, STATUS_FLOW, formatDA } from "@/lib/print-config";
import type { PrintOrderLite } from "@/lib/order-types";
import { cn } from "@/lib/utils";

// ===== الأنواع =====
interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  statusCounts: Record<string, number>;
  serviceCounts: { serviceType: string; count: number; revenue: number }[];
  recentOrders: PrintOrderLite[];
}

interface AdminAnalyticsProps {
  stats: AdminStats | null;
  shopId?: string | null;
}

interface MonthBucket {
  label: string;
  revenue: number;
  count: number;
}

interface TopCustomer {
  name: string;
  phone: string;
  count: number;
  total: number;
}

interface WeekBucket {
  label: string;
  rangeLabel: string;
  days: { date: Date; count: number }[];
  total: number;
}

interface AnalyticsResult {
  monthlyRevenue: number;
  monthlyCount: number;
  monthlyRevenueTrend: number;
  monthlyCountTrend: number;
  avgOrderValue: number;
  deliveryRate: number;
  last6Months: MonthBucket[];
  topCustomers: TopCustomer[];
  weeklyHeatmap: WeekBucket[];
}

// ===== ثوابت العرض =====
const SERVICE_LABELS: Record<string, string> = {
  document: "طباعة مستند",
  photo: "طباعة صور",
  binding: "تجليد",
  copy: "نسخ",
  card: "بطاقات",
  poster: "ملصقات",
};

const SERVICE_EMOJI: Record<string, string> = {
  document: "🖨️",
  photo: "🖼️",
  binding: "📚",
  copy: "📄",
  card: "🪪",
  poster: "📜",
};

// أسماء الأشهر بالجزائر (تستعمل godoose ar-DZ)
const MONTH_NAMES_AR = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// أيام الأسبوع مرتبة حسب getDay(): 0=الأحد ... 6=السبت
const WEEKDAY_NAMES_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const STATUS_BAR_COLOR: Record<string, string> = {
  pending: "bg-amber-400",
  printing: "bg-blue-400",
  ready: "bg-emerald-400",
  delivered: "bg-emerald-600",
  cancelled: "bg-rose-400",
};

// ===== المكوّن الرئيسي =====
export function AdminAnalytics({ stats, shopId }: AdminAnalyticsProps) {
  const [orders, setOrders] = useState<PrintOrderLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders${shopId ? `?shopId=${shopId}` : ""}`)
      .then((r) => r.json())
      .then((o) => {
        if (!cancelled) setOrders(o.orders || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const analytics = useMemo(() => computeAnalytics(orders), [orders]);

  if (loading) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
        جارٍ تحميل التحليلات...
      </div>
    );
  }

  const totalRevenue6m = analytics.last6Months.reduce((s, m) => s + m.revenue, 0);
  const totalOrders6m = analytics.last6Months.reduce((s, m) => s + m.count, 0);

  return (
    <div className="space-y-4">
      {/* ===== A. بطاقات النظرة الشهرية ===== */}
      <div>
        <SectionHeading
          icon={Sparkles}
          title="النظرة الشهرية"
          subtitle={`${MONTH_NAMES_AR[new Date().getMonth()]} ${new Date().getFullYear()}`}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MonthlyCard
            title="إجمالي إيرادات الشهر"
            value={formatDA(analytics.monthlyRevenue)}
            icon={DollarSign}
            trend={analytics.monthlyRevenueTrend}
            color="emerald"
          />
          <MonthlyCard
            title="طلبات هذا الشهر"
            value={String(analytics.monthlyCount)}
            icon={Package}
            trend={analytics.monthlyCountTrend}
            color="amber"
          />
          <MonthlyCard
            title="متوسط قيمة الطلب"
            value={formatDA(Math.round(analytics.avgOrderValue))}
            icon={BarChart3}
            color="blue"
          />
          <MonthlyCard
            title="معدل التسليم"
            value={`${analytics.deliveryRate.toFixed(1)}%`}
            icon={CheckCircle2}
            color="emerald"
          />
        </div>
      </div>

      {/* ===== B. مخطط الإيرادات لآخر 6 أشهر ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            إيرادات آخر 6 أشهر
          </CardTitle>
          <CardDescription className="text-xs">
            الإجمالي: {formatDA(totalRevenue6m)} — {totalOrders6m} طلب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={analytics.last6Months} />
        </CardContent>
      </Card>

      {/* ===== C + D. توزيع الخدمات وتوزيع الحالات ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ServiceDistribution stats={stats} />
        <StatusDistribution stats={stats} />
      </div>

      {/* ===== E. أفضل العملاء ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            أفضل العملاء
          </CardTitle>
          <CardDescription className="text-xs">
            ترتيب حسب عدد الطلبات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopCustomers customers={analytics.topCustomers} />
        </CardContent>
      </Card>

      {/* ===== F. خريطة النشاط الأسبوعي ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            النشاط الأسبوعي
          </CardTitle>
          <CardDescription className="text-xs">
            آخر 4 أسابيع — كل خلية تمثّل يوماً واحداً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyHeatmap weeks={analytics.weeklyHeatmap} />
        </CardContent>
      </Card>
    </div>
  );
}

// ===== عناوين الأقسام =====
function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <h3 className="text-sm md:text-base font-bold">{title}</h3>
      </div>
      {subtitle && (
        <span className="text-xs text-muted-foreground tabular-nums">{subtitle}</span>
      )}
    </div>
  );
}

// ===== بطاقة شهرية =====
function MonthlyCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color: "emerald" | "amber" | "blue" | "rose";
}) {
  const colorMap = {
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
    amber: { text: "text-amber-600", bg: "bg-amber-50" },
    blue: { text: "text-blue-600", bg: "bg-blue-50" },
    rose: { text: "text-rose-600", bg: "bg-rose-50" },
  };
  const c = colorMap[color];
  const hasTrend = typeof trend === "number" && isFinite(trend);
  const isUp = hasTrend && trend! >= 0;
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground truncate">{title}</div>
            <div className="text-base md:text-xl font-bold tabular-nums truncate mt-1">
              {value}
            </div>
            {hasTrend && (
              <div
                className={cn(
                  "text-xs mt-1 flex items-center gap-0.5 tabular-nums",
                  isUp ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend!).toFixed(0)}% عن الشهر الماضي
              </div>
            )}
          </div>
          <div
            className={cn(
              "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0",
              c.bg,
            )}
          >
            <Icon className={cn("h-4 w-4 md:h-5 md:w-5", c.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== مخطط الإيرادات (أعمدة CSS) =====
function RevenueChart({ data }: { data: MonthBucket[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="space-y-3">
      <div
        className="flex items-end justify-between gap-1.5 md:gap-3 h-44 md:h-52"
        dir="rtl"
      >
        {data.map((d, i) => {
          const heightPct = max > 0 ? (d.revenue / max) * 100 : 0;
          const isCurrent = i === data.length - 1;
          const isHighest = d.revenue === max && d.revenue > 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0"
            >
              {/* القيمة فوق العمود */}
              <div className="text-xs font-bold text-neutral-900 tabular-nums text-center truncate w-full">
                {d.revenue > 0 ? d.revenue.toLocaleString("en-US") : "—"}
              </div>
              {/* العمود */}
              <div className="w-full max-w-[56px] flex flex-col justify-end h-full">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-300 relative",
                    isCurrent ? "gold-gradient" : isHighest ? "bg-amber-300" : "bg-amber-200",
                  )}
                  style={{ height: `${Math.max(heightPct, 2)}%`, minHeight: "6px" }}
                >
                  {isCurrent && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </div>
              </div>
              {/* اسم الشهر */}
              <div className="text-xs text-muted-foreground text-center truncate w-full">
                {d.label}
              </div>
              {/* عدد الطلبات */}
              <div className="text-xs text-muted-foreground/70 tabular-nums text-center">
                {d.count} طلب
              </div>
            </div>
          );
        })}
      </div>
      {/* مفتاح الألوان */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm gold-gradient" />
          الشهر الحالي
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-300" />
          الأعلى
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-200" />
          الأشهر السابقة
        </span>
      </div>
    </div>
  );
}

// ===== توزيع الطلبات حسب الخدمة =====
function ServiceDistribution({ stats }: { stats: AdminStats | null }) {
  const serviceCounts = stats?.serviceCounts || [];
  const total = serviceCounts.reduce((s, x) => s + x.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-500" />
          توزيع الطلبات حسب الخدمة
        </CardTitle>
        <CardDescription className="text-xs">
          {total} طلب إجمالي
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serviceCounts.length === 0 ? (
          <EmptyState text="لا توجد طلبات بعد" />
        ) : (
          <div className="space-y-2.5">
            {[...serviceCounts]
              .sort((a, b) => b.count - a.count)
              .map((s) => {
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.serviceType} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">
                          {SERVICE_EMOJI[s.serviceType] || "🖨️"}
                        </span>
                        <span className="font-medium truncate">
                          {SERVICE_LABELS[s.serviceType] || s.serviceType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="font-bold text-neutral-900">{s.count}</span>
                        <span className="text-muted-foreground">
                          ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gold-gradient rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      الإيراد: {formatDA(s.revenue)}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== توزيع الطلبات حسب الحالة =====
function StatusDistribution({ stats }: { stats: AdminStats | null }) {
  const allStatuses = [...STATUS_FLOW, "cancelled"];
  const counts = stats?.statusCounts || {};
  const total = allStatuses.reduce((s, st) => s + (counts[st] || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-500" />
          توزيع الطلبات حسب الحالة
        </CardTitle>
        <CardDescription className="text-xs">
          {total} طلب إجمالي
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState text="لا توجد طلبات بعد" />
        ) : (
          <div className="space-y-2.5">
            {allStatuses.map((st) => {
              const meta = STATUS_META[st];
              const count = counts[st] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{meta.emoji}</span>
                      <span className="font-medium truncate">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="font-bold text-neutral-900">{count}</span>
                      <span className="text-muted-foreground">
                        ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        STATUS_BAR_COLOR[st] || "bg-amber-400",
                      )}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== أفضل العملاء =====
function TopCustomers({ customers }: { customers: TopCustomer[] }) {
  if (customers.length === 0) {
    return <EmptyState text="لا توجد بيانات عملاء بعد" />;
  }
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-2">
      {customers.map((c, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2.5 md:p-3 rounded-lg bg-muted/40 border border-border/50"
        >
          <span className="text-xl shrink-0 w-7 text-center">
            {medals[i] || "👤"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{c.name}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {c.phone || "—"}
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="text-xs text-muted-foreground tabular-nums">
              {c.count} طلب
            </div>
            <div className="font-bold text-sm text-amber-700 tabular-nums">
              {formatDA(c.total)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== خريطة النشاط الأسبوعي =====
function WeeklyHeatmap({ weeks }: { weeks: WeekBucket[] }) {
  const maxCount = Math.max(
    ...weeks.flatMap((w) => w.days.map((d) => d.count)),
    1,
  );

  function colorForCount(count: number) {
    if (count === 0) return "bg-muted/60";
    const intensity = count / maxCount;
    if (intensity > 0.75) return "bg-amber-500 text-white";
    if (intensity > 0.5) return "bg-amber-400 text-neutral-900";
    if (intensity > 0.25) return "bg-amber-300 text-neutral-900";
    return "bg-amber-200 text-neutral-900";
  }

  return (
    <div className="space-y-2">
      {/* صف رؤوس الأعمدة: اسم اليوم + أرقام الأسابيع */}
      <div className="flex items-center gap-1" dir="rtl">
        <div className="w-14 md:w-20 text-xs text-muted-foreground shrink-0">
          اليوم
        </div>
        {weeks.map((w, i) => (
          <div
            key={i}
            title={w.rangeLabel}
            className="flex-1 text-center text-xs font-bold text-neutral-700 tabular-nums cursor-help"
          >
            {w.label}
          </div>
        ))}
      </div>
      {/* صفوف الأيام: 7 أيام × 4 أسابيع */}
      {WEEKDAY_NAMES_AR.map((dayName, dayIdx) => (
        <div key={dayIdx} className="flex items-center gap-1" dir="rtl">
          <div className="w-14 md:w-20 text-xs text-muted-foreground shrink-0 truncate">
            {dayName}
          </div>
          {weeks.map((w, weekIdx) => {
            const day = w.days.find((d) => d.date.getDay() === dayIdx);
            const count = day?.count || 0;
            const dateLabel = day
              ? day.date.toLocaleDateString("ar-DZ-u-nu-latn", {
                  day: "2-digit",
                  month: "2-digit",
                })
              : "";
            return (
              <div
                key={weekIdx}
                className={cn(
                  "flex-1 aspect-square rounded-md flex items-center justify-center text-xs font-bold tabular-nums transition-colors",
                  colorForCount(count),
                )}
                title={`${dayName} ${dateLabel}: ${count} طلب`}
              >
                {count > 0 ? count : ""}
              </div>
            );
          })}
        </div>
      ))}
      {/* صف الإجماليات الأسبوعية */}
      <div
        className="flex items-center gap-1 pt-2 border-t border-border/50"
        dir="rtl"
      >
        <div className="w-14 md:w-20 text-xs text-muted-foreground shrink-0">
          الإجمالي
        </div>
        {weeks.map((w, i) => (
          <div
            key={i}
            className="flex-1 text-center text-xs font-bold text-neutral-900 tabular-nums py-1 rounded bg-muted/40"
          >
            {w.total}
          </div>
        ))}
      </div>
      {/* مفتاح الألوان */}
      <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground flex-wrap">
        <span>أقل</span>
        <span className="w-4 h-4 rounded-sm bg-muted/60" />
        <span className="w-4 h-4 rounded-sm bg-amber-200" />
        <span className="w-4 h-4 rounded-sm bg-amber-300" />
        <span className="w-4 h-4 rounded-sm bg-amber-400" />
        <span className="w-4 h-4 rounded-sm bg-amber-500" />
        <span>أكثر</span>
      </div>
    </div>
  );
}

// ===== حالة فارغة =====
function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground text-xs">
      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
      {text}
    </div>
  );
}

// ===== حساب كل المؤشرات =====
function computeAnalytics(orders: PrintOrderLite[]): AnalyticsResult {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // ===== طلبات الشهر الحالي =====
  const monthlyOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const monthlyRevenue = monthlyOrders.reduce((s, o) => s + o.total, 0);
  const monthlyCount = monthlyOrders.length;

  // ===== طلبات الشهر الماضي (للاتجاه) =====
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const lastMonthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getMonth() === lastMonthDate.getMonth() &&
      d.getFullYear() === lastMonthDate.getFullYear()
    );
  });
  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + o.total, 0);
  const lastMonthCount = lastMonthOrders.length;

  const monthlyRevenueTrend =
    lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : monthlyRevenue > 0
        ? 100
        : 0;
  const monthlyCountTrend =
    lastMonthCount > 0
      ? ((monthlyCount - lastMonthCount) / lastMonthCount) * 100
      : monthlyCount > 0
        ? 100
        : 0;

  // ===== متوسط قيمة الطلب =====
  const avgOrderValue = monthlyCount > 0 ? monthlyRevenue / monthlyCount : 0;

  // ===== معدل التسليم =====
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const delivered = orders.filter((o) => o.status === "delivered");
  const deliveryRate =
    nonCancelled.length > 0
      ? (delivered.length / nonCancelled.length) * 100
      : 0;

  // ===== آخر 6 أشهر =====
  const last6Months: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthOrders = orders.filter((o) => {
      const od = new Date(o.createdAt);
      return od.getMonth() === m && od.getFullYear() === y;
    });
    last6Months.push({
      label: MONTH_NAMES_AR[m],
      revenue: monthOrders.reduce((s, o) => s + o.total, 0),
      count: monthOrders.length,
    });
  }

  // ===== أفضل العملاء =====
  const customerMap: Record<string, TopCustomer> = {};
  orders.forEach((o) => {
    const key = o.customer.phone || o.customer.name;
    if (!customerMap[key]) {
      customerMap[key] = {
        name: o.customer.name,
        phone: o.customer.phone,
        count: 0,
        total: 0,
      };
    }
    customerMap[key].count += 1;
    customerMap[key].total += o.total;
  });
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 3);

  // ===== خريطة النشاط الأسبوعي (آخر 4 أسابيع) =====
  // الأسبوع يبدأ يوم السبت (العطلة الأسبوعية في الجزائر هي الجمعة)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0=الأحد ... 6=السبت
  // نُرجع لآخر يوم سبت: إذا اليوم سبت (6) فإن offset=0، وإلا offset = (dayOfWeek + 1) % 7
  const currentWeekStartOffset = (dayOfWeek + 1) % 7;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - currentWeekStartOffset);

  const weeklyHeatmap: WeekBucket[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const days: { date: Date; count: number }[] = [];
    let total = 0;
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);
      const dayCount = orders.filter((o) => {
        const od = new Date(o.createdAt);
        return od.toDateString() === dayDate.toDateString();
      }).length;
      days.push({ date: dayDate, count: dayCount });
      total += dayCount;
    }
    const weekNum = 4 - w;
    const rangeLabel = `${weekStart.toLocaleDateString("ar-DZ-u-nu-latn", {
      day: "2-digit",
      month: "2-digit",
    })} - ${weekEnd.toLocaleDateString("ar-DZ-u-nu-latn", {
      day: "2-digit",
      month: "2-digit",
    })}`;
    weeklyHeatmap.push({ label: `أ${weekNum}`, rangeLabel, days, total });
  }

  return {
    monthlyRevenue,
    monthlyCount,
    monthlyRevenueTrend,
    monthlyCountTrend,
    avgOrderValue,
    deliveryRate,
    last6Months,
    topCustomers,
    weeklyHeatmap,
  };
}
