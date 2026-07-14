"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Files,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Plus,
} from "lucide-react";
import type { FormTemplateT } from "@/lib/types";

interface DashboardProps {
  templates: FormTemplateT[];
  onNavigate: (view: "templates" | "records") => void;
  onNewForm: (template: FormTemplateT) => void;
}

interface Stats {
  totalRecords: number;
  totalTemplates: number;
  recentRecords: number;
  statusCounts: Record<string, number>;
  byTemplate: { templateId: string; code: string; name: string; count: number }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "مسودة", color: "text-slate-600", bg: "bg-slate-100" },
  submitted: { label: "مُقدّم", color: "text-slate-700", bg: "bg-blue-100 text-blue-700" },
  under_review: { label: "قيد المراجعة", color: "text-amber-700", bg: "bg-amber-100" },
  approved: { label: "معتمد", color: "text-emerald-700", bg: "bg-emerald-100" },
  rejected: { label: "مرفوض", color: "text-rose-700", bg: "bg-rose-100" },
};

export function Dashboard({ templates, onNavigate, onNewForm }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const featured = templates.find((t) => t.code === "نموذج 9") || templates[0];

  const cards = [
    {
      title: "إجمالي النماذج",
      value: stats?.totalTemplates ?? 0,
      icon: Files,
      desc: "قوالب جاهزة للاستخدام",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "إجمالي السجلات",
      value: stats?.totalRecords ?? 0,
      icon: FileText,
      desc: "طلب محفوظ في النظام",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "آخر 7 أيام",
      value: stats?.recentRecords ?? 0,
      icon: Clock,
      desc: "طلب جديد هذا الأسبوع",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "طلبات معتمدة",
      value: stats?.statusCounts?.approved ?? 0,
      icon: CheckCircle2,
      desc: "طلب تم اعتماده",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* الترحيب */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary/80 text-primary-foreground p-6 md:p-8">
        <div className="relative z-10">
          <div className="text-sm opacity-90 mb-1">أهلاً بك في</div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            نظام إدارة النماذج الرسمية
          </h1>
          <p className="text-sm md:text-base opacity-90 max-w-2xl mb-4">
            نظام احترافي متكامل لإدارة النماذج الرسمية والطلبات الإدارية. جاهز للعمل
            المباشر مع دعم كامل للغة العربية والطباعة الرسمية المعتمدة.
          </p>
          {featured && (
            <Button
              variant="secondary"
              onClick={() => onNewForm(featured)}
              className="bg-white text-primary hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              ابدأ بـ {featured.code}
            </Button>
          )}
        </div>
        {/* زخرفة */}
        <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -left-20 top-20 w-64 h-64 rounded-full bg-white/5" />
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                  <div className="text-sm font-medium mt-1">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
                </div>
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* النموذج المميز: نموذج 9 */}
        {featured && (
          <Card className="lg:col-span-2 border-primary/30 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  النموذج المميز
                </CardTitle>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  جاهز للاستخدام
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0">
                  <div className="text-[9px]">نموذج</div>
                  <div className="text-2xl font-bold leading-none">
                    {featured.code.replace("نموذج", "").trim()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{featured.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {featured.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs px-2 py-1 rounded-md bg-muted">
                      {featured.category}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-md bg-muted">
                      {featured.schema.sections.length} أقسام
                    </span>
                    <span className="text-xs px-2 py-1 rounded-md bg-muted">
                      {featured.schema.sections.reduce((a, s) => a + s.fields.length, 0)} حقل
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" onClick={() => onNewForm(featured)}>
                      <Plus className="h-4 w-4" />
                      تعبئة النموذج
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onNavigate("templates")}>
                      عرض كل النماذج
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* توزيع الحالات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع الحالات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(STATUS_LABELS).map(([key, meta]) => {
              const count = stats?.statusCounts?.[key] ?? 0;
              const total = stats?.totalRecords ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">{meta.label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${meta.bg} rounded-full transition-all`}
                        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {(!stats || stats.totalRecords === 0) && (
              <div className="text-center text-xs text-muted-foreground py-4">
                لا توجد سجلات بعد
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* أكثر النماذج استخداماً */}
      {stats && stats.byTemplate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">استخدام النماذج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byTemplate
                .sort((a, b) => b.count - a.count)
                .map((t) => {
                  const max = Math.max(...stats.byTemplate.map((x) => x.count), 1);
                  const pct = Math.round((t.count / max) * 100);
                  return (
                    <div key={t.templateId} className="flex items-center gap-3">
                      <div className="w-32 text-sm shrink-0 truncate">{t.code}</div>
                      <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
                        <div
                          className="h-full bg-primary/70 rounded-md flex items-center px-2 transition-all"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-xs text-primary-foreground font-medium tabular-nums">
                            {t.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
