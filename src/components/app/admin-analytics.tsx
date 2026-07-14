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
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
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

interface DayBucket {
  label: string;
  revenue: number;
  count: number;
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
  dailyTrend: DayBucket[];
}

// ===== ثوابت الألوان للمخططات =====
const CHART_COLORS = [
  "#D97706", // amber-600
  "#059669", // emerald-600
  "#DC2626", // red-600
  "#7C3AED", // violet-600
  "#0891B2", // cyan-600
  "#EA580C", // orange-600
];

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

const MONTH_NAMES_AR = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const WEEKDAY_NAMES_AR = [
  "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];

const STATUS_PIE_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  printing: "#0891B2",
  ready: "#10B981",
  delivered: "#059669",
  cancelled: "#EF4444",
};

// ===== تلميح مخصص بالعربية =====
function ArabicTooltip({
  active,
  payload,
  label,
  valueLabel,
  countLabel,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>;
  label?: string;
  valueLabel?: string;
  countLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-sm min-w-[140px]" dir="rtl">
      <div className="font-bold text-neutral-800 mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: entry.color }} />
            {entry.dataKey === "revenue" ? valueLabel || "الإيرادات" : countLabel || "الطلبات"}
          </span>
          <span className="font-bold tabular-nums text-neutral-900">
            {entry.dataKey === "revenue"
              ? entry.value.toLocaleString("ar-DZ") + " دج"
              : entry.value + " طلب"}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string; percent?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2 text-sm" dir="rtl">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-medium text-neutral-800">{d.name}</span>
      </div>
      <div className="font-bold tabular-nums text-neutral-900 mt-0.5">
        {d.value} طلب {d.payload.percent ? `(${(d.payload.percent * 100).toFixed(0)}%)` : ""}
      </div>
    </div>
  );
}

// ===== المكوّن الرئيسي =====
export function AdminAnalytics({ stats }: AdminAnalyticsProps) {
  const [orders, setOrders] = useState<PrintOrderLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/orders?limit=10000&noPreview=true")
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
  }, []);

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
            color="cyan"
          />
          <MonthlyCard
            title="معدل التسليم"
            value={`${analytics.deliveryRate.toFixed(1)}%`}
            icon={CheckCircle2}
            color="emerald"
          />
        </div>
      </div>

      {/* ===== B. مخطط الإيرادات لآخر 6 أشهر (Recharts BarChart) ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            إيرادات وطلبات آخر 6 أشهر
          </CardTitle>
          <CardDescription className="text-xs">
            الإجمالي: {formatDA(totalRevenue6m)} — {totalOrders6m} طلب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.last6Months} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <YAxis
                  yAxisId="count"
                  orientation="left"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ArabicTooltip valueLabel="الإيرادات" countLabel="الطلبات" />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, direction: "rtl" }}
                  formatter={(value: string) =>
                    value === "revenue" ? "الإيرادات (دج)" : "عدد الطلبات"
                  }
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  fill="#D97706"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  yAxisId="count"
                  dataKey="count"
                  fill="#FCD34D"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ===== B2. منحنى الإيرادات اليومية (AreaChart جديد) ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            منحنى الإيرادات اليومية
          </CardTitle>
          <CardDescription className="text-xs">
            آخر 14 يوم
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.dailyTrend.length === 0 ? (
            <EmptyState text="لا توجد بيانات كافية" />
          ) : (
            <div className="h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip content={<ArabicTooltip valueLabel="الإيرادات" />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#D97706"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={{ fill: "#D97706", r: 3 }}
                    activeDot={{ r: 5, fill: "#B45309" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== C + D. مخطط دائري للخدمات + الحالات (Recharts PieChart) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              توزيع الطلبات حسب الخدمة
            </CardTitle>
            <CardDescription className="text-xs">
              {(stats?.serviceCounts || []).reduce((s, x) => s + x.count, 0)} طلب إجمالي
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!stats?.serviceCounts || stats.serviceCounts.length === 0) ? (
              <EmptyState text="لا توجد طلبات بعد" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.serviceCounts
                        .slice()
                        .sort((a, b) => b.count - a.count)
                        .map((s) => ({
                          name: `${SERVICE_EMOJI[s.serviceType] || ""} ${SERVICE_LABELS[s.serviceType] || s.serviceType}`,
                          value: s.count,
                        }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        percent > 0.05 ? (
                          <tspan x={0} dy={0} textAnchor="middle" fill="#374151" fontSize={11}>
                            {name} {(percent * 100).toFixed(0)}%
                          </tspan>
                        ) : null
                      }
                      labelLine={false}
                    >
                      {stats.serviceCounts.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              توزيع الطلبات حسب الحالة
            </CardTitle>
            <CardDescription className="text-xs">
              {(() => {
                const allStatuses = [...STATUS_FLOW, "cancelled"];
                const counts = stats?.statusCounts || {};
                return allStatuses.reduce((s, st) => s + (counts[st] || 0), 0);
              })()} طلب إجمالي
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const allStatuses = [...STATUS_FLOW, "cancelled"];
              const counts = stats?.statusCounts || {};
              const pieData = allStatuses
                .map((st) => ({
                  name: `${STATUS_META[st].emoji} ${STATUS_META[st].label}`,
                  value: counts[st] || 0,
                  fill: STATUS_PIE_COLORS[st] || "#9CA3AF",
                }))
                .filter((d) => d.value > 0);

              if (pieData.length === 0) return <EmptyState text="لا توجد طلبات بعد" />;

              return (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) =>
                          percent > 0.05 ? (
                            <tspan x={0} dy={0} textAnchor="middle" fill="#374151" fontSize={11}>
                              {name} {(percent * 100).toFixed(0)}%
                            </tspan>
                          ) : null
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ===== E. إيرادات الخدمات (مخطط أفقي) ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-amber-500" />
            مقارنة إيرادات الخدمات
          </CardTitle>
          <CardDescription className="text-xs">
            إجمالي الإيرادات حسب نوع الخدمة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!stats?.serviceCounts || stats.serviceCounts.length === 0) ? (
            <EmptyState text="لا توجد بيانات" />
          ) : (
            <div className="h-52 md:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.serviceCounts
                    .slice()
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((s) => ({
                      name: `${SERVICE_EMOJI[s.serviceType]} ${SERVICE_LABELS[s.serviceType] || s.serviceType}`,
                      revenue: s.revenue,
                      count: s.count,
                    }))}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#374151" }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<ArabicTooltip valueLabel="الإيرادات" />} />
                  <Bar
                    dataKey="revenue"
                    fill="#D97706"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== F. أفضل العملاء ===== */}
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

      {/* ===== G. خريطة النشاط الأسبوعي ===== */}
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
  color: "emerald" | "amber" | "cyan" | "rose";
}) {
  const colorMap = {
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
    amber: { text: "text-amber-600", bg: "bg-amber-50" },
    cyan: { text: "text-cyan-600", bg: "bg-cyan-50" },
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

// ===== خريطة النشاط الأسبوعي (CSS Grid) =====
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

  // طلبات الشهر الحالي
  const monthlyOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const monthlyRevenue = monthlyOrders.reduce((s, o) => s + o.total, 0);
  const monthlyCount = monthlyOrders.length;

  // طلبات الشهر الماضي
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

  const avgOrderValue = monthlyCount > 0 ? monthlyRevenue / monthlyCount : 0;

  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  const delivered = orders.filter((o) => o.status === "delivered");
  const deliveryRate =
    nonCancelled.length > 0
      ? (delivered.length / nonCancelled.length) * 100
      : 0;

  // آخر 6 أشهر
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

  // منحنى يومي (آخر 14 يوم)
  const dailyTrend: DayBucket[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - i);
    dayDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayDate);
    nextDay.setDate(dayDate.getDate() + 1);
    const dayOrders = orders.filter((o) => {
      const od = new Date(o.createdAt);
      return od >= dayDate && od < nextDay;
    });
    dailyTrend.push({
      label: dayDate.toLocaleDateString("ar-DZ-u-nu-latn", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length,
    });
  }

  // أفضل العملاء
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

  // خريطة النشاط الأسبوعي
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
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
    dailyTrend,
  };
}