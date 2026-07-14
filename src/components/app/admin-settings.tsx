"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Truck,
  SlidersHorizontal,
  Layers,
  RefreshCw,
  CircleAlert,
  CheckCircle2,
  Star,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Lock,
  CalendarClock,
  Percent,
  ShoppingCart,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/default-settings";
import type {
  ServiceSpec,
  SpecSection,
  SpecOption,
  ServiceType,
} from "@/lib/service-specs";

// إعادة تصدير النوع المركزي للإعدادات
export type { AppSettings } from "@/lib/default-settings";

// ============================================================
// أدوات مساعدة
// ============================================================

/** توليد معرّف فريد قصير */
function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** نسخة عميقة آمنة (للإعدادات القابلة للتسلسل JSON) */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** مقارنة عميقة لكائنين قابلين للتسلسل */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** تحويل قيمة نصية إلى رقم بأمان */
function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================
// مكوّن الحقل الصغير: لافتة + مدخل
// ============================================================

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  dir?: "rtl" | "ltr";
  className?: string;
  hint?: string;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  dir,
  className,
  hint,
}: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="h-9 text-sm"
      />
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

// ============================================================
// أيقونة الخدمة حسب النوع
// ============================================================

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  document: "مستند",
  photo: "صور",
  binding: "تجليد",
  copy: "نسخ",
  card: "بطاقات",
  poster: "ملصقات",
};

// ============================================================
// المكوّن الرئيسي
// ============================================================

export function AdminSettings({ shopId }: { shopId?: string | null }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [original, setOriginal] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState("services");

  // تحميل الإعدادات عند التركيب
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings${shopId ? `?shopId=${shopId}` : ""}`);
      if (!res.ok) throw new Error("فشل تحميل الإعدادات");
      const data = (await res.json()) as AppSettings;
      const safe: AppSettings = {
        services: data.services ?? DEFAULT_SETTINGS.services,
        deliveryOptions: data.deliveryOptions ?? DEFAULT_SETTINGS.deliveryOptions,
        general: { ...DEFAULT_SETTINGS.general, ...(data.general ?? {}) },
      };
      setSettings(safe);
      setOriginal(deepClone(safe));
    } catch (e) {
      toast.error("تعذّر تحميل الإعدادات", {
        description: (e as Error).message,
      });
      // استخدام الافتراضي كنسخة احتياطية
      setSettings(deepClone(DEFAULT_SETTINGS));
      setOriginal(deepClone(DEFAULT_SETTINGS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // مؤشر التغييرات غير المحفوظة
  const hasChanges = useMemo(() => {
    if (!settings || !original) return false;
    return !deepEqual(settings, original);
  }, [settings, original]);

  // ======== محدّثات الحالة ========

  /** تحديث حقل في الإعدادات العامة */
  function updateGeneral<K extends keyof AppSettings["general"]>(
    key: K,
    value: AppSettings["general"][K],
  ) {
    setSettings((prev) =>
      prev
        ? { ...prev, general: { ...prev.general, [key]: value } }
        : prev,
    );
  }

  /** تحديث حقل في خدمة معيّنة */
  function updateService(
    serviceIdx: number,
    patch: Partial<ServiceSpec>,
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = [...prev.services];
      services[serviceIdx] = { ...services[serviceIdx], ...patch };
      return { ...prev, services };
    });
  }

  /** تحديث حقل في قسم معيّن داخل خدمة */
  function updateSection(
    serviceIdx: number,
    sectionIdx: number,
    patch: Partial<SpecSection>,
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s, i) => {
        if (i !== serviceIdx) return s;
        const sections = s.sections.map((sec, j) =>
          j === sectionIdx ? { ...sec, ...patch } : sec,
        );
        return { ...s, sections };
      });
      return { ...prev, services };
    });
  }

  /** تحديث حقل في خيار معيّن */
  function updateOption(
    serviceIdx: number,
    sectionIdx: number,
    optionIdx: number,
    patch: Partial<SpecOption>,
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s, i) => {
        if (i !== serviceIdx) return s;
        const sections = s.sections.map((sec, j) => {
          if (j !== sectionIdx) return sec;
          const options = sec.options.map((opt, k) =>
            k === optionIdx ? { ...opt, ...patch } : opt,
          );
          return { ...sec, options };
        });
        return { ...s, sections };
      });
      return { ...prev, services };
    });
  }

  /** إضافة خيار جديد لقسم */
  function addOption(serviceIdx: number, sectionIdx: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s, i) => {
        if (i !== serviceIdx) return s;
        const sections = s.sections.map((sec, j) => {
          if (j !== sectionIdx) return sec;
          const newOpt: SpecOption = {
            id: uid("opt"),
            label: "خيار جديد",
            emoji: "✨",
            description: "",
          };
          return { ...sec, options: [...sec.options, newOpt] };
        });
        return { ...s, sections };
      });
      return { ...prev, services };
    });
    toast.success("تمت إضافة خيار جديد");
  }

  /** حذف خيار */
  function deleteOption(
    serviceIdx: number,
    sectionIdx: number,
    optionIdx: number,
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s, i) => {
        if (i !== serviceIdx) return s;
        const sections = s.sections.map((sec, j) => {
          if (j !== sectionIdx) return sec;
          return {
            ...sec,
            options: sec.options.filter((_, k) => k !== optionIdx),
          };
        });
        return { ...s, sections };
      });
      return { ...prev, services };
    });
    toast.success("تم حذف الخيار");
  }

  /** إضافة قسم جديد لخدمة */
  function addSection(serviceIdx: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s, i) => {
        if (i !== serviceIdx) return s;
        const newSection: SpecSection = {
          id: uid("sec"),
          title: "قسم جديد",
          hint: "",
          optionKey: `new_${uid("k")}`,
          options: [],
        };
        return { ...s, sections: [...s.sections, newSection] };
      });
      return { ...prev, services };
    });
    toast.success("تمت إضافة قسم جديد");
  }

  /** حذف قسم */
  function deleteSection(serviceIdx: number, sectionIdx: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      const services = prev.services.map((s, i) => {
        if (i !== serviceIdx) return s;
        return {
          ...s,
          sections: s.sections.filter((_, j) => j !== sectionIdx),
        };
      });
      return { ...prev, services };
    });
    toast.success("تم حذف القسم");
  }

  // ======== خيارات التسليم ========

  function updateDelivery(
    idx: number,
    patch: Partial<AppSettings["deliveryOptions"][number]>,
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      const deliveryOptions = prev.deliveryOptions.map((d, i) =>
        i === idx ? { ...d, ...patch } : d,
      );
      return { ...prev, deliveryOptions };
    });
  }

  function addDelivery() {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        deliveryOptions: [
          ...prev.deliveryOptions,
          {
            id: uid("del"),
            label: "خيار توصيل جديد",
            emoji: "🚚",
            description: "",
            badge: "",
            surcharge: 0,
          },
        ],
      };
    });
    toast.success("تمت إضافة خيار توصيل");
  }

  function deleteDelivery(idx: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        deliveryOptions: prev.deliveryOptions.filter((_, i) => i !== idx),
      };
    });
    toast.success("تم حذف خيار التوصيل");
  }

  // ======== الحفظ ========

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/settings${shopId ? `?shopId=${shopId}` : ""}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, shopId: shopId || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل الحفظ");
      }
      setOriginal(deepClone(settings));
      toast.success("تم حفظ الإعدادات بنجاح", {
        description: "ستظهر التغييرات للعملاء فوراً",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      });
    } catch (e) {
      toast.error("فشل حفظ الإعدادات", {
        description: (e as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch(`/api/settings${shopId ? `?shopId=${shopId}` : ""}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل إعادة التعيين");
      }
      const fresh = deepClone(DEFAULT_SETTINGS);
      setSettings(fresh);
      setOriginal(deepClone(fresh));
      toast.success("تمت إعادة التعيين للإعدادات الافتراضية", {
        description: "عادت كل القيم إلى الوضع الأصلي",
        icon: <RotateCcw className="h-4 w-4 text-amber-500" />,
      });
      setActiveTab("services");
    } catch (e) {
      toast.error("فشلت إعادة التعيين", {
        description: (e as Error).message,
      });
    } finally {
      setResetting(false);
    }
  }

  function handleDiscard() {
    if (!original) return;
    setSettings(deepClone(original));
    toast.info("تم التراجع عن التغييرات");
  }

  // ======== حالة التحميل ========

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mb-3 text-amber-500" />
        <p className="text-sm">جارٍ تحميل الإعدادات...</p>
      </div>
    );
  }

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className="space-y-5" dir="rtl">
      {/* ===== الترويسة ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
            <Settings className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              إدارة الإعدادات
              {hasChanges && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  تغييرات غير محفوظة
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              عدّل الخدمات والأسعار وخيارات التوصيل والإعدادات العامة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4" />
              تراجع
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-neutral-900 hover:bg-neutral-800 text-white gap-1.5"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {/* ===== التبويبات ===== */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-5"
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/60">
          <TabsTrigger
            value="services"
            className="flex items-center gap-1.5 py-2 text-xs sm:text-sm data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            <Layers className="h-4 w-4" />
            الخدمات والأسعار
          </TabsTrigger>
          <TabsTrigger
            value="delivery"
            className="flex items-center gap-1.5 py-2 text-xs sm:text-sm data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            <Truck className="h-4 w-4" />
            خيارات التسليم
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="flex items-center gap-1.5 py-2 text-xs sm:text-sm data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
            الإعدادات العامة
          </TabsTrigger>
          <TabsTrigger
            value="reset"
            className="flex items-center gap-1.5 py-2 text-xs sm:text-sm data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            <CircleAlert className="h-4 w-4" />
            إعادة التعيين
          </TabsTrigger>
        </TabsList>

        {/* ===== التبويب 1: الخدمات ===== */}
        <TabsContent value="services" className="space-y-4 outline-none">
          <Card className="border-amber-200/60 bg-gradient-to-l from-amber-50/50 to-transparent">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                اضغط على أي خدمة لتوسيعها وتعديل أقسامها وخياراتها.
                تذكر أن الحقول الرقمية مثل المضاعف تؤثر مباشرة
                في حساب الأسعار. اضغط &quot;حفظ التغييرات&quot; في الأعلى
                لتثبيت كل التعديلات.
              </div>
            </CardContent>
          </Card>

          <Accordion type="multiple" className="space-y-3">
            {settings.services.map((service, sIdx) => (
              <AccordionItem
                key={service.type}
                value={`service-${service.type}`}
                className="border border-border rounded-xl bg-card overflow-hidden px-0 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40">
                  <div className="flex items-center gap-3 w-full pr-2">
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center text-xl shrink-0">
                      {service.emoji}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {service.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/50"
                        >
                          {SERVICE_TYPE_LABELS[service.type]}
                        </Badge>
                        {service.isPopular && (
                          <Badge className="text-xs gold-gradient text-neutral-900 gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            شائع
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {service.description} · {service.sections.length} قسم
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-sm font-bold text-amber-700">
                        {service.basePricePerPage} دج
                      </div>
                      <div className="text-xs text-muted-foreground">
                        لكل صفحة
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* خصائص الخدمة الأساسية */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40">
                    <Field
                      label="اسم الخدمة"
                      value={service.name}
                      onChange={(v) => updateService(sIdx, { name: v })}
                      className="col-span-2"
                    />
                    <Field
                      label="الإيموجي"
                      value={service.emoji}
                      onChange={(v) => updateService(sIdx, { emoji: v })}
                      dir="ltr"
                    />
                    <Field
                      label="السعر الأساسي/صفحة (دج)"
                      type="number"
                      value={service.basePricePerPage}
                      onChange={(v) =>
                        updateService(sIdx, {
                          basePricePerPage: toNumber(v),
                        })
                      }
                    />
                    <Field
                      label="الوصف"
                      value={service.description}
                      onChange={(v) =>
                        updateService(sIdx, { description: v })
                      }
                      className="col-span-2"
                    />
                    <Field
                      label="الشعبية (0-100)"
                      type="number"
                      value={service.popularity}
                      onChange={(v) =>
                        updateService(sIdx, { popularity: toNumber(v) })
                      }
                    />
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!service.isPopular}
                          onChange={(e) =>
                            updateService(sIdx, { isPopular: e.target.checked })
                          }
                          className="w-4 h-4 rounded accent-amber-500"
                        />
                        <span className="text-muted-foreground">
                          خدمة شائعة
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* الأقسام */}
                  <div className="space-y-3">
                    {service.sections.map((section, secIdx) => (
                      <div
                        key={section.id}
                        className="rounded-lg border border-border bg-background"
                      >
                        {/* رأس القسم */}
                        <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-muted/20">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground shrink-0">
                              القسم {secIdx + 1}
                            </span>
                            <Input
                              value={section.title}
                              onChange={(e) =>
                                updateSection(sIdx, secIdx, {
                                  title: e.target.value,
                                })
                              }
                              className="h-8 text-sm flex-1 min-w-0"
                            />
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="حذف القسم"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  حذف القسم؟
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف قسم &quot;{section.title}&quot; وجميع
                                  خياراته. لا يمكن التراجع إلا بإعادة الحفظ.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSection(sIdx, secIdx)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {/* تفاصيل القسم */}
                        <div className="p-3 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Field
                              label="تلميح"
                              value={section.hint ?? ""}
                              onChange={(v) =>
                                updateSection(sIdx, secIdx, { hint: v })
                              }
                            />
                            <Field
                              label="المعرّف الفريد للخيار"
                              value={section.optionKey}
                              onChange={(v) =>
                                updateSection(sIdx, secIdx, { optionKey: v })
                              }
                              dir="ltr"
                            />
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">
                                نوع الاختيار
                              </Label>
                              <Select
                                value={section.multiple ? "multiple" : "single"}
                                onValueChange={(v) =>
                                  updateSection(sIdx, secIdx, {
                                    multiple: v === "multiple",
                                  })
                                }
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">
                                    اختيار واحد
                                  </SelectItem>
                                  <SelectItem value="multiple">
                                    اختيار متعدد
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* الخيارات */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground">
                                الخيارات ({section.options.length})
                              </Label>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => addOption(sIdx, secIdx)}
                              >
                                <Plus className="h-3 w-3" />
                                خيار
                              </Button>
                            </div>

                            {section.options.length === 0 ? (
                              <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg">
                                لا توجد خيارات. اضغط &quot;خيار&quot; للإضافة.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {section.options.map((opt, oIdx) => (
                                  <div
                                    key={opt.id}
                                    className="rounded-lg border border-border p-3 bg-muted/20 space-y-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-base shrink-0">
                                        {opt.emoji || "•"}
                                      </span>
                                      <Input
                                        value={opt.label}
                                        onChange={(e) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            label: e.target.value,
                                          })
                                        }
                                        className="h-8 text-sm font-medium flex-1"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() =>
                                          deleteOption(sIdx, secIdx, oIdx)
                                        }
                                        title="حذف الخيار"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      <Field
                                        label="الإيموجي"
                                        value={opt.emoji ?? ""}
                                        onChange={(v) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            emoji: v,
                                          })
                                        }
                                        dir="ltr"
                                      />
                                      <Field
                                        label="سعر ثابت (دج)"
                                        type="number"
                                        value={opt.price ?? 0}
                                        onChange={(v) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            price: toNumber(v),
                                          })
                                        }
                                      />
                                      <Field
                                        label="سعر/صفحة (دج)"
                                        type="number"
                                        value={opt.pricePerPage ?? 0}
                                        onChange={(v) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            pricePerPage: toNumber(v),
                                          })
                                        }
                                      />
                                      <Field
                                        label="المضاعف"
                                        type="number"
                                        value={opt.multiplier ?? 1}
                                        onChange={(v) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            multiplier: toNumber(v),
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <Field
                                        label="الوصف"
                                        value={opt.description ?? ""}
                                        onChange={(v) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            description: v,
                                          })
                                        }
                                      />
                                      <Field
                                        label="ملاحظة"
                                        value={opt.note ?? ""}
                                        onChange={(v) =>
                                          updateOption(sIdx, secIdx, oIdx, {
                                            note: v,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* زر إضافة قسم */}
                    <Button
                      variant="outline"
                      className="w-full border-dashed h-10 text-sm gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => addSection(sIdx)}
                    >
                      <Plus className="h-4 w-4" />
                      إضافة قسم جديد لخدمة {service.name}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        {/* ===== التبويب 2: التسليم ===== */}
        <TabsContent value="delivery" className="space-y-4 outline-none">
          <Card className="border-amber-200/60 bg-gradient-to-l from-amber-50/50 to-transparent">
            <CardContent className="p-4 flex items-start gap-3">
              <Truck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                تحكّم في خيارات التوصيل المعروضة للعملاء. الرسوم الإضافية
                تُضاف إلى إجمالي الطلب.
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settings.deliveryOptions.map((del, dIdx) => (
              <Card key={del.id} className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-lg">{del.emoji}</span>
                      <Input
                        value={del.label}
                        onChange={(e) =>
                          updateDelivery(dIdx, { label: e.target.value })
                        }
                        className="h-8 text-sm max-w-[180px]"
                      />
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteDelivery(dIdx)}
                      title="حذف خيار التوصيل"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    معرّف: <span dir="ltr" className="font-mono">{del.id}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="الإيموجي"
                      value={del.emoji}
                      onChange={(v) => updateDelivery(dIdx, { emoji: v })}
                      dir="ltr"
                    />
                    <Field
                      label="الشارة"
                      value={del.badge ?? ""}
                      onChange={(v) => updateDelivery(dIdx, { badge: v })}
                      placeholder="اختياري"
                    />
                  </div>
                  <Field
                    label="الوصف"
                    value={del.description}
                    onChange={(v) => updateDelivery(dIdx, { description: v })}
                  />
                  <Field
                    label="رسوم إضافية (دج)"
                    type="number"
                    value={del.surcharge}
                    onChange={(v) =>
                      updateDelivery(dIdx, { surcharge: toNumber(v) })
                    }
                    hint="0 = بدون رسوم"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full border-dashed h-11 text-sm gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={addDelivery}
          >
            <Plus className="h-4 w-4" />
            إضافة خيار توصيل جديد
          </Button>
        </TabsContent>

        {/* ===== التبويب 3: عام ===== */}
        <TabsContent value="general" className="space-y-4 outline-none">
          {/* الخصومات */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-500" />
                الخصومات والحدود
              </CardTitle>
              <CardDescription className="text-xs">
                خصومات الكميات والإعدادات المالية
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="خصم 10 نسخ (%)"
                type="number"
                value={settings.general.quantityDiscount10}
                onChange={(v) =>
                  updateGeneral("quantityDiscount10", toNumber(v))
                }
                hint="يُطبّق تلقائياً عند 10 نسخ فأكثر"
              />
              <Field
                label="خصم 50 نسخة (%)"
                type="number"
                value={settings.general.quantityDiscount50}
                onChange={(v) =>
                  updateGeneral("quantityDiscount50", toNumber(v))
                }
                hint="يُطبّق تلقائياً عند 50 نسخة فأكثر"
              />
              <Field
                label="خصم الوجهين (%)"
                type="number"
                value={settings.general.sidesDiscount}
                onChange={(v) => updateGeneral("sidesDiscount", toNumber(v))}
                hint="نسبة التوفير عند الطباعة على الوجهين"
              />
              <Field
                label="أدنى مبلغ للطلب (دج)"
                type="number"
                value={settings.general.minOrder}
                onChange={(v) => updateGeneral("minOrder", toNumber(v))}
                hint="الحد الأدنى لقيمة الطلب المسموح به"
              />
            </CardContent>
          </Card>

          {/* التواصل */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-500" />
                معلومات التواصل
              </CardTitle>
              <CardDescription className="text-xs">
                تظهر في التذييل ورسائل العملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                  رقم واتساب
                </Label>
                <Input
                  value={settings.general.whatsappNumber}
                  onChange={(e) =>
                    updateGeneral("whatsappNumber", e.target.value)
                  }
                  dir="ltr"
                  className="h-9 text-sm"
                  placeholder="0560000000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  رقم الهاتف
                </Label>
                <Input
                  value={settings.general.phoneNumber}
                  onChange={(e) =>
                    updateGeneral("phoneNumber", e.target.value)
                  }
                  dir="ltr"
                  className="h-9 text-sm"
                  placeholder="0560000000"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-rose-500" />
                  البريد الإلكتروني
                </Label>
                <Input
                  value={settings.general.email}
                  onChange={(e) => updateGeneral("email", e.target.value)}
                  dir="ltr"
                  className="h-9 text-sm"
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  العنوان
                </Label>
                <Textarea
                  value={settings.general.address}
                  onChange={(e) => updateGeneral("address", e.target.value)}
                  className="text-sm min-h-[60px]"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-purple-500" />
                  ساعات العمل
                </Label>
                <Input
                  value={settings.general.workHours}
                  onChange={(e) => updateGeneral("workHours", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="السبت - الخميس: 8:00 ص — 7:00 م"
                />
              </div>
            </CardContent>
          </Card>

          {/* الأمان والنظام */}
          <Card className="border-amber-200/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                الأمان والنظام
              </CardTitle>
              <CardDescription className="text-xs">
                إعدادات حساسة — تعامل بحذر
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  كود الإدارة (PIN)
                </Label>
                <Input
                  value={settings.general.adminCode}
                  onChange={(e) => updateGeneral("adminCode", e.target.value)}
                  dir="ltr"
                  className="h-9 text-sm font-mono tracking-widest"
                  maxLength={8}
                  placeholder="2514"
                />
                <p className="text-xs text-amber-700/80 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  تغييره سيؤثر على دخول الموظفين
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
                  الحذف التلقائي (أيام)
                </Label>
                <Input
                  type="number"
                  value={settings.general.autoDeleteDays}
                  onChange={(e) =>
                    updateGeneral("autoDeleteDays", toNumber(e.target.value))
                  }
                  className="h-9 text-sm"
                  min={1}
                />
                <p className="text-xs text-muted-foreground/80">
                  تُحذف الطلبات المكتملة بعد هذه المدة
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
                  أدنى طلب (تكرار)
                </Label>
                <Input
                  type="number"
                  value={settings.general.minOrder}
                  onChange={(e) =>
                    updateGeneral("minOrder", toNumber(e.target.value))
                  }
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground/80">
                  بالدينار الجزائري
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== التبويب 4: إعادة التعيين ===== */}
        <TabsContent value="reset" className="space-y-4 outline-none">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                منطقة الخطر
              </CardTitle>
              <CardDescription className="text-xs">
                إعادة تعيين كل الإعدادات إلى قيمها الافتراضية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <CircleAlert className="h-4 w-4" />
                  ماذا سيحدث؟
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 pr-6 list-disc">
                  <li>
                    سيتم حذف كل التعديلات على الخدمات وأسعارها وأقسامها.
                  </li>
                  <li>ستعود خيارات التوصيل إلى حالتها الأصلية.</li>
                  <li>ستعود الإعدادات العامة (الخصومات، التواصل، PIN) للافتراضية.</li>
                  <li className="text-destructive/90 font-medium">
                    لا يمكن التراجع عن هذا الإجراء!
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  القيم الافتراضية الرئيسية:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">خصم 10 نسخ</span>
                    <span className="font-medium">
                      {DEFAULT_SETTINGS.general.quantityDiscount10}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">خصم 50 نسخة</span>
                    <span className="font-medium">
                      {DEFAULT_SETTINGS.general.quantityDiscount50}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">كود الإدارة</span>
                    <span className="font-mono font-medium" dir="ltr">
                      {DEFAULT_SETTINGS.general.adminCode}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">عدد الخدمات</span>
                    <span className="font-medium">
                      {DEFAULT_SETTINGS.services.length} خدمات
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                      disabled={resetting}
                    >
                      <RotateCcw className="h-4 w-4" />
                      إعادة التعيين للإعدادات الافتراضية
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        تأكيد إعادة التعيين
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد تماماً من إعادة ضبط كل الإعدادات؟
                        سيتم حذف جميع التخصيصات نهائياً ولا يمكن التراجع.
                        يُنصح بحفظ نسخة يدوية من الإعدادات الحالية قبل
                        المتابعة.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReset}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        نعم، أعد التعيين
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  variant="ghost"
                  className="gap-1.5"
                  onClick={loadSettings}
                  disabled={resetting}
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة تحميل من الخادم
                </Button>
              </div>

              {hasChanges && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  لديك تغييرات غير محفوظة حالياً. إعادة التعيين ستحل محلها
                  كلها.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== شريط الحفظ السفلي العائم (يظهر فقط عند وجود تغييرات) ===== */}
      {hasChanges && (
        <div className="sticky bottom-4 z-30 mx-auto max-w-md">
          <div className="bg-neutral-900 text-white rounded-xl shadow-lg p-3 flex items-center justify-between gap-3 border border-amber-500/30">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>لديك تغييرات غير محفوظة</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-neutral-300 hover:text-white hover:bg-neutral-800 h-8"
                onClick={handleDiscard}
                disabled={saving}
              >
                تراجع
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gold-gradient text-neutral-900 hover:opacity-90 h-8 gap-1.5"
              >
                {saving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                حفظ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
