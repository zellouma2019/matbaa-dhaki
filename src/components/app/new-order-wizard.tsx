"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Check,
  Clock,
  Sparkles,
  Brain,
  Zap,
  Phone as PhoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  COLORS,
  PAPER_TYPES,
  DELIVERY_OPTIONS,
  PRINT_RANGES,
  estimateDeliveryHours,
  formatDA,
} from "@/lib/print-config";

import {
  SERVICE_SPECS as DEFAULT_SERVICE_SPECS,
  calculatePricingCustom,
  type ServiceSpec,
  type ServiceType,
} from "@/lib/service-specs";
import { analyzeFileReal, parsePageRange, type RealFileAnalysis } from "@/lib/file-analyzer";
import { isValidAlgerianPhone, getPhoneErrorMessage } from "@/lib/phone-validation";
import { selectOffer, type Offer } from "@/lib/offers";
import { OfferPopup } from "@/components/app/offer-popup";
import type { CreatedOrder } from "@/components/app/app-shell";
import type { PrintOrderLite } from "@/lib/order-types";

interface NewOrderWizardProps {
  onCreated: (order: CreatedOrder) => void;
  /** طلب سابق للتعبئة المسبقة (لتكرار الطلب) */
  prefillOrder?: PrintOrderLite | null;
  /** عند انتهاء التعديل من تكرار الطلب */
  onPrefillConsumed?: () => void;
  shopId?: string | null;
}

const STEP_LABELS = ["اختيار الخدمة", "إعدادات الطباعة", "وقت التسليم", "معلومات التواصل", "مراجعة الطلب"];
const STEP_DURATIONS = ["أقل من 15 ثانية", "حوالي 30 ثانية", "5 ثوانٍ", "15 ثانية", "10 ثوانٍ"];

export function NewOrderWizard({ onCreated, prefillOrder, onPrefillConsumed, shopId }: NewOrderWizardProps) {
  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [analysis, setAnalysis] = useState<RealFileAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [totalPages, setTotalPages] = useState(10); // إجمالي صفحات الملف
  const [pages, setPages] = useState(10); // الصفحات الفعلية للطباعة
  const [printRange, setPrintRange] = useState<"all" | "custom">("all");
  const [pageRange, setPageRange] = useState(""); // "1-5, 8, 10-12"
  const [copies, setCopies] = useState(1);
  const [notes, setNotes] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("today");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [custWhatsapp, setCustWhatsapp] = useState("");
  const [whatsappTouched, setWhatsappTouched] = useState(false);
  const [custEmail, setCustEmail] = useState("");
  const [custDelivery, setCustDelivery] = useState("pickup");
  const [custAddress, setCustAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [offerShown, setOfferShown] = useState(false);
  const [offerPopupOpen, setOfferPopupOpen] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);

  // ===== جلب إعدادات المتجر (خدمات وأسعار مخصصة) =====
  const [shopServices, setShopServices] = useState<ServiceSpec[] | null>(null);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    fetch(`/api/settings?shopId=${shopId}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.services && Array.isArray(d.services) && d.services.length > 0) {
          setShopServices(d.services);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [shopId]);

  // المواصفات الفعالة: من إعدادات المتجر أو الافتراضية
  const activeSpecs = useMemo<Record<string, ServiceSpec>>(() => {
    if (shopServices && shopServices.length > 0) {
      const map: Record<string, ServiceSpec> = {};
      shopServices.forEach((s) => { map[s.type] = s; });
      return map;
    }
    return DEFAULT_SERVICE_SPECS;
  }, [shopServices]);

  // قائمة الخدمات الفعالة (مرتّبة بالشعبية)
  const activeServices = useMemo(() => {
    const list = Object.values(activeSpecs).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return list.map((s) => ({
      type: s.type as ServiceType,
      name: s.name,
      emoji: s.emoji,
      description: s.description,
      popularity: s.popularity,
      isPopular: s.isPopular,
    }));
  }, [activeSpecs]);

  // الخيارات المخصصة لكل خدمة (موحّدة في كائن واحد)
  const [specOptions, setSpecOptions] = useState<Record<string, string>>({});

  function setSpecOption(key: string, value: string) {
    setSpecOptions((prev) => ({ ...prev, [key]: value }));
  }

  // التعبئة المسبقة من طلب سابق (لتكرار الطلب)
  useEffect(() => {
    if (prefillOrder) {
      setServiceType(prefillOrder.serviceType as ServiceType);
      setFileName(prefillOrder.fileName || "");
      setFileType(prefillOrder.fileType || "");
      setFileSize(prefillOrder.fileSize || 0);
      setTotalPages(prefillOrder.options.totalPages || prefillOrder.options.pages);
      setPages(prefillOrder.options.pages);
      setPrintRange((prefillOrder.options.printRange as "all" | "custom") || "all");
      setPageRange(prefillOrder.options.pageRange || "");
      setCopies(prefillOrder.options.copies);
      // تحميل الخيارات في specOptions (متوافق مع المخطط القديم والجديد)
      const opts = prefillOrder.options as unknown as Record<string, unknown>;
      const loaded: Record<string, string> = {};
      if (opts.color) loaded.color = opts.color as string;
      if (opts.paperSize) loaded.paperSize = opts.paperSize as string;
      if (opts.sides) loaded.sides = opts.sides as string;
      if (opts.binding) loaded.binding = opts.binding as string;
      if (opts.paperType) loaded.paperType = opts.paperType as string;
      // خيارات مخصصة إضافية محفوظة
      if (opts.photoSize) loaded.photoSize = opts.photoSize as string;
      if (opts.finish) loaded.finish = opts.finish as string;
      if (opts.retouch) loaded.retouch = opts.retouch as string;
      if (opts.bindingType) loaded.bindingType = opts.bindingType as string;
      if (opts.coverColor) loaded.coverColor = opts.coverColor as string;
      if (opts.coverPrint) loaded.coverPrint = opts.coverPrint as string;
      if (opts.cardType) loaded.cardType = opts.cardType as string;
      if (opts.lamination) loaded.lamination = opts.lamination as string;
      if (opts.posterSize) loaded.posterSize = opts.posterSize as string;
      if (opts.material) loaded.material = opts.material as string;
      if (opts.sorting) loaded.sorting = opts.sorting as string;
      if (opts.extras) loaded.extras = opts.extras as string;
      setSpecOptions(loaded);
      setNotes(prefillOrder.options.notes || "");
      setDeliveryMode(prefillOrder.delivery.mode);
      setDeliveryDate(prefillOrder.delivery.date);
      setCustName(prefillOrder.customer.name);
      setCustPhone(prefillOrder.customer.phone);
      setCustWhatsapp(prefillOrder.customer.whatsapp || "");
      setCustEmail(prefillOrder.customer.email || "");
      setCustDelivery(prefillOrder.customer.deliveryMethod);
      setCustAddress(prefillOrder.customer.address || "");
      setStep(1); // ابدأ من إعدادات الطباعة للتعديل
      toast.info("تم تحميل بيانات الطلب السابق", {
        description: "عدّل ما تريد ثم أكّد الطلب الجديد",
      });
      onPrefillConsumed?.();
    }
  }, [prefillOrder]);

  const selectedService = useMemo(
    () => activeServices.find((s) => s.type === serviceType),
    [serviceType, activeServices],
  );

  const currentSpec = useMemo<ServiceSpec | null>(
    () => (serviceType ? activeSpecs[serviceType] : null),
    [serviceType, activeSpecs],
  );

  // تحديث عدد الصفحات الفعلي عند تغيير النطاق
  useEffect(() => {
    if (printRange === "all") {
      setPages(totalPages);
    } else if (pageRange.trim()) {
      const parsed = parsePageRange(pageRange, totalPages);
      setPages(parsed);
    }
  }, [printRange, pageRange, totalPages]);

  // إظهار عرض مفاجئ عند الوصول لمراجعة الطلب (الخطوة 4)
  // التأخير 4 ثواني بعد ظهور صفحة المراجعة لإعطاء العميل وقتاً للاطلاع
  useEffect(() => {
    if (step === 4 && !offerShown && serviceType) {
      const selectedOffer = selectOffer(serviceType, pages, copies);
      if (selectedOffer) {
        setOffer(selectedOffer);
        setOfferShown(true); // اضبط أولاً لمنع إعادة التشغيل
        // تأخير 4 ثواني لإظهار النافذة بشكل مفاجئ بعد قراءة العميل للمراجعة
        const t = setTimeout(() => {
          setOfferPopupOpen(true);
        }, 4000);
        return () => { clearTimeout(t); };
      }
    }
  }, [step, offerShown, serviceType, pages, copies]);

  const pricing = useMemo(() => {
    if (!serviceType) return null;
    return calculatePricingCustom({
      serviceType,
      pages,
      copies,
      delivery: deliveryMode,
      selectedOptions: specOptions,
    }, activeSpecs);
  }, [serviceType, pages, copies, deliveryMode, specOptions, activeSpecs]);

  // السعر النهائي بعد تطبيق العرض المختار
  const finalPricing = useMemo(() => {
    if (!pricing) return null;
    if (!appliedOffer) return pricing;

    let discountAmount = 0;
    let freeServiceNote = "";

    if (appliedOffer.discountPercent) {
      discountAmount = Math.round((pricing.total * appliedOffer.discountPercent) / 100);
    }
    if (appliedOffer.freeService) {
      freeServiceNote = appliedOffer.freeService;
      // خصم قيمة الخدمة المجانية من التشطيب إن وجدت
      if (appliedOffer.freeService.includes("تجليد")) {
        discountAmount += pricing.finishingCost;
      }
    }

    return {
      ...pricing,
      total: Math.max(0, pricing.total - discountAmount),
      discount: pricing.discount + discountAmount,
      appliedOfferNote: freeServiceNote || `${appliedOffer.discountPercent}% خصم`,
    } as typeof pricing & { appliedOfferNote: string };
  }, [pricing, appliedOffer]);

  const estimatedHours = useMemo(() => {
    return estimateDeliveryHours(deliveryMode, pages, copies);
  }, [deliveryMode, pages, copies]);

  const visibleServices = showAllServices ? activeServices : activeServices.slice(0, 3);

  function canProceed(): boolean {
    if (step === 0) return !!serviceType;
    if (step === 1 && printRange === "custom") return pages > 0;
    if (step === 2) return !!deliveryMode && (deliveryMode !== "scheduled" || !!deliveryDate);
    if (step === 3) {
      if (!custName.trim() || !custPhone.trim()) return false;
      if (!isValidAlgerianPhone(custPhone)) return false;
      if (custWhatsapp.trim() && !isValidAlgerianPhone(custWhatsapp)) return false;
      if (custDelivery === "delivery" && !custAddress.trim()) return false;
      return true;
    }
    return true;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const ext = (f.name.split(".").pop() || "").toUpperCase();
    setFileType(ext);
    setFileSize(f.size);

    // تشغيل التحليل الحقيقي
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeFileReal(f);
      setAnalysis(result);
      setTotalPages(result.pageCount);
      setPages(result.pageCount);
      setPrintRange("all");
      setPageRange("");
      setServiceType(result.detectedService);

      // تطبيق التوصيات على specOptions حسب نوع الخدمة المكتشفة
      const spec = DEFAULT_SERVICE_SPECS[result.detectedService];
      const defaults: Record<string, string> = {};
      spec.sections.forEach((section) => {
        // اختيار أول خيار افتراضي أو التوصية
        if (section.optionKey === "color" && result.suggestedColor) {
          defaults.color = result.suggestedColor;
        } else if (section.optionKey === "paperSize" && result.suggestedPaperSize) {
          defaults.paperSize = result.suggestedPaperSize;
        } else if (section.optionKey === "paperType" && result.suggestedPaperType) {
          defaults.paperType = result.suggestedPaperType;
        } else if (section.optionKey === "binding" && result.suggestedBinding) {
          defaults.binding = result.suggestedBinding;
        } else if (section.options.length > 0) {
          // أول خيار كافتراضي
          defaults[section.optionKey] = section.options[0].id;
        }
      });
      setSpecOptions(defaults);

      toast.success("اكتمل التحليل الحقيقي للملف", {
        description: `${result.detectedServiceName} · ${result.pageCount} صفحة فعلية · دقة ${result.confidence}%`,
      });
    } catch (err) {
      toast.error("تعذّر تحليل الملف", { description: (err as Error).message });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    if (!serviceType || !pricing || !finalPricing) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          fileName: fileName || null,
          fileType: fileType || null,
          fileSize: fileSize || null,
          smartAnalysis: analysis
            ? {
                detectedService: analysis.detectedService,
                detectedServiceName: analysis.detectedServiceName,
                pageCount: analysis.pageCount,
                suggestedColor: analysis.suggestedColor,
                suggestedPaperSize: analysis.suggestedPaperSize,
                suggestedPaperType: analysis.suggestedPaperType,
                suggestedBinding: analysis.suggestedBinding,
                confidence: analysis.confidence,
                insights: analysis.insights,
              }
            : null,
          options: {
            pages,
            copies,
            notes,
            printRange,
            pageRange: printRange === "custom" ? pageRange : undefined,
            totalPages,
            appliedOffer: appliedOffer
              ? {
                  code: appliedOffer.code,
                  title: appliedOffer.title,
                  type: appliedOffer.type,
                  discountPercent: appliedOffer.discountPercent,
                  freeService: appliedOffer.freeService,
                  freeProduct: appliedOffer.freeProduct,
                }
              : null,
            ...specOptions, // كل الخيارات المخصصة (color, paperType, lamination, etc.)
          },
          customer: {
            name: custName,
            phone: custPhone,
            whatsapp: custWhatsapp,
            email: custEmail,
            deliveryMethod: custDelivery,
            address: custAddress,
          },
          delivery: { mode: deliveryMode, date: deliveryDate },
          // السعر النهائي بعد تطبيق العرض
          finalTotal: finalPricing.total,
          appliedOfferCode: appliedOffer?.code || null,
          ...(shopId ? { shopId } : {}),
        }),
      });
      if (!res.ok) throw new Error("فشل إرسال الطلب");
      const order = await res.json();
      toast.success("تم استلام طلبك بنجاح! 🎉");
      onCreated({
        id: order.id,
        reference: order.reference,
        serviceName: order.serviceName,
        total: finalPricing.total,
        status: order.status,
        estimatedHours: order.estimatedHours,
      });
      // إعادة التعيين
      setStep(0);
      setServiceType(null);
      setFileName("");
      setAnalysis(null);
      setTotalPages(10);
      setPages(10);
      setPrintRange("all");
      setPageRange("");
      setCopies(1);
      setNotes("");
      setSpecOptions({});
      setAppliedOffer(null);
      setOffer(null);
      setOfferShown(false);
      setCustName("");
      setCustPhone("");
      setCustWhatsapp("");
      setCustEmail("");
      setCustAddress("");
      setDeliveryMode("today");
      setDeliveryDate("");
      setCustDelivery("pickup");
    } catch (e) {
      toast.error("خطأ في إرسال الطلب", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!canProceed()) {
      toast.error("يرجى إكمال البيانات المطلوبة");
      return;
    }
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  // عند اختيار خدمة يدوياً، عيّن الإعدادات الافتراضية للخدمة
  function handleServiceSelect(type: ServiceType) {
    setServiceType(type);
    const spec = activeSpecs[type];
    const defaults: Record<string, string> = {};
    spec.sections.forEach((section) => {
      if (section.options.length > 0) {
        defaults[section.optionKey] = section.options[0].id;
      }
    });
    setSpecOptions(defaults);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div>
        {/* رأس المعالج */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {STEP_DURATIONS[step]}
              </span>
              <span className="text-xs text-muted-foreground">
                الخطوة {step + 1} من 5
              </span>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              المجموع ≈ دقيقة واحدة
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold">{STEP_LABELS[step]}</h2>
          <div className="mt-3 flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-amber-400" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ===== الخطوة 0: اختيار الخدمة + رفع الملف + التحليل الحقيقي ===== */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">ارفع ملفك هنا</Label>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <Brain className="h-3.5 w-3.5 text-amber-600" />
                نظام ذكي سيحلل ملفك فعلياً ويستخرج كل المعلومات الحقيقية
              </p>
              <label className="block cursor-pointer relative">
                <div className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl p-6 md:p-8 text-center hover:bg-amber-50 transition-colors">
                  <div className="w-14 h-14 mx-auto rounded-2xl gold-gradient flex items-center justify-center mb-3">
                    <Upload className="h-7 w-7 text-white" />
                  </div>
                  {fileName ? (
                    <div>
                      <div className="flex items-center justify-center gap-2 text-sm font-medium text-amber-800 break-all">
                        <FileText className="h-4 w-4 shrink-0" />
                        {fileName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">انقر لتغيير الملف</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-sm">اسحب وأفلت ملفك هنا</div>
                      <div className="text-xs text-muted-foreground mt-1">أو انقر للاختيار من جهازك</div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFile}
                  accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                />
              </label>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {["PDF", "DOCX", "JPG", "PNG", "WEBP"].map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                🔒 ملفاتك آمنة — تُعالج محلياً في متصفحك ولا تُرفع لأي خادم خارجي
              </p>
            </div>

            {/* التحليل الحقيقي جارٍ */}
            {analyzing && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-2">
                      جارٍ التحليل الحقيقي للملف
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">نقرأ محتوى الملف الفعلي ونستخرج الصفحات والنص والبيانات الوصفية...</div>
                  </div>
                </div>
              </div>
            )}

            {/* نتيجة التحليل الحقيقي */}
            {analysis && !analyzing && (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">اكتمل التحليل الحقيقي للملف</div>
                    <div className="text-xs text-muted-foreground">
                      بيانات حقيقية مستخرجة من الملف — يمكنك تعديلها في الخطوة التالية
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">الدقة</div>
                    <div className="text-lg font-bold text-emerald-700">{analysis.confidence}%</div>
                  </div>
                </div>

                {/* ===== معاينة الملف البصرية ===== */}
                {analysis.thumbnailUrl && (
                  <div className="mb-4 flex gap-4 items-start">
                    <div className="shrink-0">
                      <div className="relative w-28 h-36 rounded-lg overflow-hidden border-2 border-emerald-200 bg-white shadow-sm">
                        
                        <img
                          src={analysis.thumbnailUrl}
                          alt="معاينة الملف"
                          className="w-full h-full object-cover"
                        />
                        {analysis.fileType === "PDF" && (
                          <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                            PDF
                          </div>
                        )}
                      </div>
                      <div className="text-center text-xs text-emerald-700 mt-1 font-medium">
                        {analysis.isPortrait ? "عمودي" : "أفقي"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      {analysis.fileNature && (
                        <div className="inline-block text-xs font-bold text-emerald-800 bg-white border border-emerald-200 rounded-full px-3 py-1">
                          {analysis.fileNature}
                        </div>
                      )}
                      <div className="text-xs text-emerald-800 break-all">
                        📄 {analysis.fileName}
                      </div>
                      <div className="text-xs text-emerald-700">
                        📦 {analysis.fileSizeKB} ك.ب · {analysis.fileType}
                      </div>
                      {analysis.imageDimensions && (
                        <div className="text-xs text-emerald-800 flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                            📐 {analysis.imageDimensions.width}×{analysis.imageDimensions.height}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                            {analysis.imageDimensions.megapixels} ميجابكسل
                          </span>
                        </div>
                      )}
                      {analysis.dominantColors && analysis.dominantColors.length > 0 && (
                        <div className="text-xs text-emerald-800 flex items-center gap-2">
                          <span>الألوان السائدة:</span>
                          {analysis.dominantColors.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-emerald-200"
                            >
                              {c.startsWith("rgb") ? (
                                <span
                                  className="w-3 h-3 rounded-full border border-neutral-200"
                                  style={{ backgroundColor: c }}
                                />
                              ) : null}
                              {c.startsWith("rgb") ? "" : c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* بدون معاينة (PDF فشل أو DOCX) */}
                {!analysis.thumbnailUrl && (
                  <div className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-white border border-emerald-200">
                    <div className="w-12 h-12 rounded-lg bg-neutral-900 flex items-center justify-center text-amber-400 text-xl font-bold shrink-0">
                      {analysis.fileType === "PDF" ? "📄" : analysis.fileType === "DOCX" ? "📝" : "📁"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-emerald-800 break-all">{analysis.fileName}</div>
                      {analysis.fileNature && (
                        <div className="text-xs text-emerald-700">{analysis.fileNature}</div>
                      )}
                      <div className="text-xs text-emerald-600">
                        📦 {analysis.fileSizeKB} ك.ب · {analysis.fileType}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <AnalysisChip label="الخدمة" value={analysis.detectedServiceName} />
                  <AnalysisChip label="الصفحات الفعلية" value={`${analysis.pageCount}`} />
                  <AnalysisChip label="الطباعة" value={COLORS.find((c) => c.id === analysis.suggestedColor)?.label || "—"} />
                  <AnalysisChip label="الورق" value={PAPER_TYPES.find((p) => p.id === analysis.suggestedPaperType)?.label || "—"} />
                </div>
                {(analysis.pdfTitle || analysis.pdfAuthor) && (
                  <div className="mb-2 text-xs text-emerald-800 flex flex-wrap items-center gap-2">
                    {analysis.pdfTitle && (
                      <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                        📄 {analysis.pdfTitle}
                      </span>
                    )}
                    {analysis.pdfAuthor && (
                      <span className="px-2 py-0.5 rounded bg-white border border-emerald-200">
                        ✍️ {analysis.pdfAuthor}
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  {analysis.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-800">
                      <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{ins}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* اختيار الخدمة */}
            <div>
              <Label className="text-base font-semibold mb-1 block">ماذا تريد أن تفعل؟</Label>
              <p className="text-xs text-muted-foreground mb-3">
                الأكثر طلباً — أو ارفع ملفك أولاً لتحديد تلقائي
              </p>
              <div className="space-y-3">
                {visibleServices.map((s, i) => (
                  <button
                    key={s.type}
                    onClick={() => handleServiceSelect(s.type)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all ${
                      serviceType === s.type
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : "border-border bg-card hover:border-amber-300 hover:bg-amber-50/30"
                    }`}
                  >
                    <div className="relative">
                      <div className="text-2xl md:text-3xl">{s.emoji}</div>
                      <span className="absolute -top-2 -right-2 text-xs font-bold px-1.5 py-0.5 rounded-full bg-neutral-900 text-amber-400">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{s.name}</span>
                        {s.isPopular && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            الأكثر طلباً
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-xs text-muted-foreground">يختاره</div>
                      <div className="text-sm font-bold text-amber-700">{s.popularity}%</div>
                    </div>
                  </button>
                ))}
              </div>
              {!showAllServices && (
                <button
                  onClick={() => setShowAllServices(true)}
                  className="w-full mt-3 py-2.5 text-sm text-amber-700 hover:text-amber-800 font-medium border border-dashed border-amber-300 rounded-xl hover:bg-amber-50 transition-colors"
                >
                  عرض خدمات أخرى ↓
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===== الخطوة 1: إعدادات الطباعة ===== */}
        {step === 1 && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-2xl md:text-3xl">{selectedService.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{selectedService.name}</div>
                <div className="text-xs text-muted-foreground">{selectedService.description}</div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-xs text-muted-foreground">السعر التقديري</div>
                <div className="font-bold text-amber-700">{pricing ? formatDA(pricing.total) : formatDA(selectedService.basePricePerPage)}</div>
              </div>
            </div>

            {analysis && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
                <Zap className="h-4 w-4 shrink-0 mt-0.5" />
                <span>الإعدادات الحالية مُطبّقة من التحليل الحقيقي للملف — يمكنك تعديلها بحرية</span>
              </div>
            )}

            {/* ===== خيار نطاق الطباعة (فقط للخدمات متعددة الصفحات) ===== */}
            {fileName && currentSpec?.hasPrintRange && (
              <Section title="نطاق الطباعة" hint="هل تريد طباعة الملف كاملاً أم صفحات معينة؟">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRINT_RANGES.map((r) => (
                    <OptionCard
                      key={r.id}
                      selected={printRange === r.id}
                      onClick={() => setPrintRange(r.id as "all" | "custom")}
                      emoji={r.emoji}
                      label={r.label}
                      description={r.description}
                    />
                  ))}
                </div>
                {printRange === "custom" && (
                  <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <Label className="text-sm font-medium">أدخل أرقام الصفحات</Label>
                    <Input
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="مثال: 1-5, 8, 10-12"
                      className="mt-1.5 font-mono"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      استخدم شرطة (-) للنطاق وفاصلة (,) للفصل. إجمالي صفحات الملف: {totalPages}
                    </p>
                    {pageRange.trim() && (
                      <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                        ✓ سيتم طباعة <strong>{pages}</strong> صفحة من أصل {totalPages}
                      </div>
                    )}
                  </div>
                )}
                {printRange === "all" && totalPages > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    📄 سيتم طباعة جميع صفحات الملف ({totalPages} صفحة)
                  </div>
                )}
              </Section>
            )}

            {/* عدد الصفحات (فقط للخدمات متعددة الصفحات) */}
            {currentSpec?.hasPageCount && (
            <Section title="عدد الصفحات" hint={printRange === "custom" ? "محسوب من النطاق المحدد" : "عدد صفحات الملف المراد طباعته"}>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setPages(Math.max(1, pages - 1))} disabled={printRange === "custom"}>−</Button>
                <Input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 text-center font-bold"
                  disabled={printRange === "custom"}
                />
                <Button variant="outline" size="icon" onClick={() => setPages(pages + 1)} disabled={printRange === "custom"}>+</Button>
                <span className="text-sm text-muted-foreground">{currentSpec?.unit || "صفحة"}</span>
                {printRange === "custom" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    من نطاق محدد
                  </span>
                )}
              </div>
            </Section>
            )}

            {/* ===== أقسام المواصفات المخصصة لكل خدمة ===== */}
            {currentSpec && currentSpec.sections.map((section) => {
              const selectedId = specOptions[section.optionKey];
              const cols = section.options.length === 2 ? "grid-cols-2" :
                           section.options.length === 3 ? "grid-cols-3" :
                           section.options.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                           section.options.length === 5 ? "grid-cols-2 md:grid-cols-5" :
                           "grid-cols-2 md:grid-cols-3";
              return (
                <Section key={section.id} title={section.title} hint={section.hint}>
                  <div className={`grid gap-3 ${cols}`}>
                    {section.options.map((opt) => {
                      const price = opt.price !== undefined && opt.price !== 0
                        ? `+${formatDA(opt.price)}`
                        : opt.pricePerPage !== undefined && opt.pricePerPage !== 0
                          ? opt.pricePerPage > 0
                            ? `+${formatDA(opt.pricePerPage)}/صفحة`
                            : `${formatDA(Math.abs(opt.pricePerPage))} خصم/صفحة`
                          : undefined;
                      return (
                        <OptionCard
                          key={opt.id}
                          selected={selectedId === opt.id}
                          onClick={() => setSpecOption(section.optionKey, opt.id)}
                          emoji={opt.emoji}
                          label={opt.label}
                          description={opt.description}
                          price={price}
                          note={opt.note}
                        />
                      );
                    })}
                  </div>
                </Section>
              );
            })}

            <Section title="عدد النسخ" hint="خصم من 10 نسخ">
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="icon" onClick={() => setCopies(Math.max(1, copies - 1))}>−</Button>
                <Input
                  type="number"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 text-center font-bold"
                />
                <Button variant="outline" size="icon" onClick={() => setCopies(copies + 1)}>+</Button>
                <span className="text-sm text-muted-foreground">نسخة</span>
                {copies >= 10 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    خصم {copies >= 50 ? "15%" : "10%"}
                  </span>
                )}
              </div>
            </Section>

            <Section title="ملاحظات إضافية" hint="اختياري">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي تفاصيل إضافية تريد إخبارنا بها..."
                rows={3}
              />
            </Section>
          </div>
        )}

        {/* ===== الخطوة 2: وقت التسليم ===== */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DELIVERY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDeliveryMode(d.id)}
                  className={`relative p-5 rounded-2xl border-2 text-right transition-all ${
                    deliveryMode === d.id
                      ? "border-amber-400 bg-amber-50 shadow-sm"
                      : "border-border bg-card hover:border-amber-300"
                  }`}
                >
                  {d.badge && (
                    <span className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white urgent-pulse">
                      {d.badge}
                    </span>
                  )}
                  <div className="text-3xl mb-2">{d.emoji}</div>
                  <div className="font-bold text-sm">{d.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{d.description}</div>
                  {d.surcharge > 0 && (
                    <div className="text-xs text-amber-700 font-medium mt-1">+{formatDA(d.surcharge)}</div>
                  )}
                </button>
              ))}
            </div>
            {deliveryMode === "scheduled" && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <Label className="text-sm font-medium">اختر التاريخ</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-2 max-w-xs"
                />
              </div>
            )}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>الوقت المتوقع للتسليم: <strong>{estimatedHours} {estimatedHours === 1 ? "ساعة" : estimatedHours <= 10 ? "ساعات" : "ساعة"}</strong> بعد تأكيد الطلب</span>
            </div>
          </div>
        )}

        {/* ===== الخطوة 3: معلومات التواصل ===== */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">الاسم</Label>
                <Input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">رقم الهاتف * (10 أرقام بالضبط)</Label>
                <Input
                  type="tel"
                  value={custPhone}
                  onChange={(e) => {
                    // فلتر: أرقام فقط، حد أقصى 10 أرقام
                    const cleaned = e.target.value.replace(/\D/g, "").substring(0, 10);
                    setCustPhone(cleaned);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="0560123456"
                  maxLength={10}
                  className={`mt-1.5 font-mono tracking-wider ${
                    phoneTouched && custPhone && !isValidAlgerianPhone(custPhone)
                      ? "border-destructive bg-destructive/5"
                      : phoneTouched && isValidAlgerianPhone(custPhone)
                        ? "border-emerald-400 bg-emerald-50/30"
                        : ""
                  }`}
                  dir="ltr"
                />
                <div className="flex items-center justify-between mt-1">
                  {phoneTouched && custPhone && !isValidAlgerianPhone(custPhone) ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span>✗</span> {getPhoneErrorMessage(custPhone)}
                    </p>
                  ) : phoneTouched && isValidAlgerianPhone(custPhone) ? (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <span>✓</span> رقم صحيح
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">05 أو 06 أو 07 (موبايل) أو 03 (فاكس)</p>
                  )}
                  <span className={`text-xs tabular-nums ${custPhone.length === 10 ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>
                    {custPhone.length}/10
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">واتساب (إذا كان مختلفاً) - 10 أرقام</Label>
                <Input
                  type="tel"
                  value={custWhatsapp}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").substring(0, 10);
                    setCustWhatsapp(cleaned);
                  }}
                  onBlur={() => setWhatsappTouched(true)}
                  placeholder="اتركه فارغاً إذا كان نفس رقم الهاتف"
                  maxLength={10}
                  className={`mt-1.5 font-mono tracking-wider ${
                    whatsappTouched && custWhatsapp && !isValidAlgerianPhone(custWhatsapp)
                      ? "border-destructive bg-destructive/5"
                      : whatsappTouched && custWhatsapp && isValidAlgerianPhone(custWhatsapp)
                        ? "border-emerald-400 bg-emerald-50/30"
                        : ""
                  }`}
                  dir="ltr"
                />
                {whatsappTouched && custWhatsapp && !isValidAlgerianPhone(custWhatsapp) && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <span>✗</span> {getPhoneErrorMessage(custWhatsapp)}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium">البريد الإلكتروني (اختياري)</Label>
                <Input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1.5"
                  dir="ltr"
                />
              </div>
            </div>

            <Section title="طريقة الاستلام" hint="كيف تريد استلام طلبك؟">
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  selected={custDelivery === "pickup"}
                  onClick={() => setCustDelivery("pickup")}
                  emoji="🏪"
                  label="استلام من المطبعة"
                  description="شارع ديدوش مراد"
                  price="مجاني"
                />
                <OptionCard
                  selected={custDelivery === "delivery"}
                  onClick={() => setCustDelivery("delivery")}
                  emoji="🛵"
                  label="توصيل للعنوان"
                  description="ضمن الجزائر العاصمة"
                  price="+200 دج"
                />
              </div>
            </Section>

            {custDelivery === "delivery" && (
              <div>
                <Label className="text-sm font-medium">عنوان التوصيل *</Label>
                <Textarea
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="الولاية، البلدية، الحي، الشارع..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            )}
          </div>
        )}

        {/* ===== الخطوة 4: مراجعة الطلب ===== */}
        {step === 4 && selectedService && pricing && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-5 bg-neutral-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedService.emoji}</span>
                  <div>
                    <div className="font-bold">{selectedService.name}</div>
                    <div className="text-xs text-neutral-300">{selectedService.description}</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-neutral-300">المجموع</div>
                  {appliedOffer && finalPricing && finalPricing.total < pricing.total ? (
                    <div>
                      <div className="text-xs text-neutral-400 line-through">{formatDA(pricing.total)}</div>
                      <div className="text-2xl font-bold text-amber-400">{formatDA(finalPricing.total)}</div>
                      <div className="text-xs text-emerald-400 font-medium">
                        {finalPricing.appliedOfferNote}
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-amber-400">{formatDA(pricing.total)}</div>
                  )}
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-sm mb-3">تفاصيل الطلب</h4>

                {/* ===== معاينة الملف المرفوع ===== */}
                {fileName && (
                  <div className="mb-4 flex gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                    {/* صورة المعاينة */}
                    {analysis?.thumbnailUrl ? (
                      <div className="shrink-0 relative">
                        <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-amber-200 bg-white shadow-sm">
                          
                          <img
                            src={analysis.thumbnailUrl}
                            alt="معاينة الملف"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {analysis.fileType === "PDF" && (
                          <div className="absolute -top-1 -left-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                            PDF
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="shrink-0 w-16 h-20 rounded-lg bg-neutral-900 flex items-center justify-center text-2xl">
                        {analysis?.fileType === "PDF" ? "📄" : analysis?.fileType === "DOCX" ? "📝" : selectedService.emoji}
                      </div>
                    )}
                    {/* معلومات الملف */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-bold text-neutral-900 break-all">{fileName}</div>
                      {analysis?.fileNature && (
                        <div className="inline-block text-xs font-medium text-amber-800 bg-white border border-amber-200 rounded-full px-2 py-0.5">
                          {analysis.fileNature}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {analysis?.fileType && (
                          <span className="px-1.5 py-0.5 rounded bg-white border border-amber-100">
                            {analysis.fileType}
                          </span>
                        )}
                        {analysis?.fileSizeKB && (
                          <span className="px-1.5 py-0.5 rounded bg-white border border-amber-100">
                            📦 {analysis.fileSizeKB} ك.ب
                          </span>
                        )}
                        {analysis?.pageCount && analysis.pageCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-white border border-amber-100">
                            📄 {analysis.pageCount} صفحة
                          </span>
                        )}
                        {analysis?.imageDimensions && (
                          <span className="px-1.5 py-0.5 rounded bg-white border border-amber-100">
                            📐 {analysis.imageDimensions.width}×{analysis.imageDimensions.height}
                          </span>
                        )}
                        {analysis?.isPortrait !== undefined && (
                          <span className="px-1.5 py-0.5 rounded bg-white border border-amber-100">
                            {analysis.isPortrait ? "↕ عمودي" : "↔ أفقي"}
                          </span>
                        )}
                      </div>
                      {analysis?.confidence && (
                        <div className="text-xs text-emerald-600 flex items-center gap-1">
                          <span>✓</span> تحليل ذكي بدقة {analysis.confidence}%
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                  {currentSpec?.hasPrintRange && (
                    <ReviewRow label="نطاق الطباعة" value={printRange === "all" ? "الملف كامل" : `صفحات: ${pageRange || "—"}`} />
                  )}
                  {currentSpec?.hasPageCount && (
                    <ReviewRow label="عدد الصفحات" value={`${pages} ${currentSpec?.unit || "صفحة"}`} />
                  )}
                  <ReviewRow label="عدد النسخ" value={`${copies} ${currentSpec?.unit === "بطاقة" ? "بطاقة" : currentSpec?.unit === "صورة" ? "صورة" : currentSpec?.unit === "ملصق" ? "ملصق" : "نسخة"}`} />
                  {/* عرض كل خيارات المواصفات المختارة ديناميكياً */}
                  {currentSpec && currentSpec.sections.map((section) => {
                    const selId = specOptions[section.optionKey];
                    const opt = section.options.find((o) => o.id === selId);
                    if (!opt) return null;
                    return (
                      <ReviewRow
                        key={section.id}
                        label={section.title}
                        value={`${opt.emoji || ""} ${opt.label}`.trim()}
                      />
                    );
                  })}
                  <ReviewRow
                    label="التسليم"
                    value={DELIVERY_OPTIONS.find((d) => d.id === deliveryMode)?.label || deliveryMode}
                  />
                  <ReviewRow label="العميل" value={custName} />
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  ℹ️ سيتم تأكيد السعر النهائي بعد مراجعة الملف
                </div>

                <div className="mt-3 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="font-bold text-sm mb-1 flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-amber-600" />
                    سنتواصل معك قبل بدء الطباعة
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    سنتصل بك على الرقم أدناه لتأكيد الطلب والتفاصيل النهائية قبل تنفيذ الطباعة.
                    تأكد من توفّرك لاستقبال المكالمة.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-bold text-neutral-900" dir="ltr">
                    📞 {custPhone}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <Button variant="outline" onClick={prev} disabled={step === 0}>
            <ArrowRight className="h-4 w-4" />
            السابق
          </Button>
          <div className="text-xs text-muted-foreground">
            {step + 1} / 5
          </div>
          <Button
            onClick={next}
            disabled={!canProceed() || submitting}
            className="bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            {submitting ? (
              <span className="animate-pulse">جارٍ الإرسال...</span>
            ) : step === 4 ? (
              <>
                <Check className="h-4 w-4" />
                إنشاء طلب الطباعة
              </>
            ) : (
              <>
                التالي
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ===== الشريط الجانبي: ملخص الطلب ===== */}
      <aside className="lg:sticky lg:top-24 h-fit">
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b bg-neutral-900 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧾</span>
              <span className="font-bold text-sm">طلبك</span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {selectedService ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedService.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm">{selectedService.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedService.description}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2 text-xs">
                  {step >= 1 && (
                    <>
                      {fileName && (
                        <SummaryRow label="النطاق" value={printRange === "all" ? "كامل" : "صفحات محددة"} />
                      )}
                      <SummaryRow label="الصفحات" value={`${pages}`} />
                      <SummaryRow label="النسخ" value={`${copies}`} />
                      {currentSpec && currentSpec.sections.slice(0, 3).map((section) => {
                        const selId = specOptions[section.optionKey];
                        const opt = section.options.find((o) => o.id === selId);
                        if (!opt) return null;
                        return (
                          <SummaryRow key={section.id} label={section.title} value={opt.label} />
                        );
                      })}
                    </>
                  )}
                  {step >= 2 && (
                    <SummaryRow label="التسليم" value={DELIVERY_OPTIONS.find((d) => d.id === deliveryMode)?.label ?? ""} />
                  )}
                  {step >= 3 && custName && (
                    <SummaryRow label="العميل" value={custName} />
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <div className="text-3xl mb-2">🖨️</div>
                اختر خدمة لتبدأ بناء طلبك
              </div>
            )}

            {pricing && (
              <div className="border-t pt-3 space-y-2">
                <div className="text-xs text-muted-foreground">سعر شفاف — لا مفاجآت</div>
                <SummaryRow label="سعر الصفحة" value={formatDA(pricing.perPage)} />
                {pricing.sidesSaving > 0 && (
                  <SummaryRow label="توفير الوجهين" value={`−${formatDA(pricing.sidesSaving)}`} green />
                )}
                {pricing.finishingCost > 0 && (
                  <SummaryRow label="التشطيب/التجليد" value={formatDA(pricing.finishingCost)} />
                )}
                {pricing.deliveryCost > 0 && (
                  <SummaryRow label="التوصيل العاجل" value={formatDA(pricing.deliveryCost)} />
                )}
                {pricing.discount > 0 && (
                  <SummaryRow label="خصم الكمية" value={`−${formatDA(pricing.discount)}`} green />
                )}
                {appliedOffer && finalPricing && finalPricing.total < pricing.total && (
                  <SummaryRow
                    label={`عرض خاص (${appliedOffer.code})`}
                    value={`−${formatDA(pricing.total - finalPricing.total)}`}
                    green
                  />
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-bold text-sm">المجموع</span>
                  {appliedOffer && finalPricing && finalPricing.total < pricing.total ? (
                    <div className="text-left">
                      <span className="text-xs text-muted-foreground line-through block">{formatDA(pricing.total)}</span>
                      <span className="text-2xl font-bold text-amber-700">
                        {formatDA(finalPricing.total)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-amber-700">
                      {formatDA(pricing.total)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border bg-card p-4 space-y-2.5 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>سعر شفاف — لا مفاجآت</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>تابع طلبك لحظة بلحظة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>أسرع من إرسال واتساب</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>أعد طلبك السابق بنقرة</span>
          </div>
        </div>
      </aside>

      {/* نافذة العرض المفاجئ */}
      <OfferPopup
        offer={offer}
        open={offerPopupOpen}
        onClose={() => setOfferPopupOpen(false)}
        onAccept={(o) => {
          setAppliedOffer(o);
          setOfferPopupOpen(false);
          const saving = o.discountPercent
            ? `${o.discountPercent}% خصم`
            : o.freeService || "مكافأة مجانية";
          toast.success("تم تطبيق العرض على طلبك! 🎉", {
            description: `${saving} · الكود: ${o.code}`,
          });
        }}
      />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
        <Label className="text-base font-semibold">{title}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AnalysisChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-emerald-200 p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xs font-bold text-emerald-700 truncate">{value}</div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  emoji,
  label,
  description,
  price,
  note,
}: {
  selected: boolean;
  onClick: () => void;
  emoji?: string;
  label: string;
  description?: string;
  price?: string;
  note?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 text-right transition-all ${
        selected
          ? "border-amber-400 bg-amber-50 shadow-sm"
          : "border-border bg-card hover:border-amber-300"
      }`}
    >
      {selected && (
        <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </span>
      )}
      {emoji && <div className="text-2xl mb-1">{emoji}</div>}
      <div className="font-semibold text-sm">{label}</div>
      {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      {price && (
        <div className={`text-xs font-bold mt-1 ${selected ? "text-amber-700" : "text-muted-foreground"}`}>
          {price}
        </div>
      )}
      {note && <div className="text-xs text-amber-700 mt-1">{note}</div>}
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-left break-all">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${green ? "text-emerald-600" : ""}`}>{value}</span>
    </div>
  );
}
