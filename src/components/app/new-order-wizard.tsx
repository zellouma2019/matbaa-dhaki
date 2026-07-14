"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Check,
  Clock,
  Sparkles,
  Zap,
  Phone as PhoneIcon,
  CheckCircle2,
  Sun,
  Moon,
  CalendarDays,
  Timer,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  SERVICES as STATIC_SERVICES,
  COLORS,
  PAPER_SIZES,
  SIDES,
  BINDINGS,
  PAPER_TYPES,
  DELIVERY_OPTIONS,
  PRINT_RANGES,
  calculatePricing,
  estimateDeliveryHours,
  formatDA,
  type ServiceType,
  type PricingInput,
} from "@/lib/print-config";
import {
  SERVICE_SPECS as STATIC_SERVICE_SPECS,
  SPEC_LIST,
  calculatePricingCustom,
  type ServiceSpec,
  type SpecOption,
} from "@/lib/service-specs";
import type { AppSettings } from "@/lib/default-settings";
import { analyzeFileReal, analyzeFileWithAI, parsePageRange, type RealFileAnalysis } from "@/lib/file-analyzer";
import UploadStep, { type AnalysisPhase } from "@/components/app/upload-step";
import { isValidAlgerianPhone, getPhoneErrorMessage } from "@/lib/phone-validation";
import { selectOffer, type Offer } from "@/lib/offers";
import { OfferPopup } from "@/components/app/offer-popup";
import type { CreatedOrder } from "@/components/app/app-shell";
import type { PrintOrderLite } from "@/lib/order-types";
// FileAnalysisPanel replaced by UploadStep

interface NewOrderWizardProps {
  onCreated: (order: CreatedOrder) => void;
  /** طلب سابق للتعبئة المسبقة (لتكرار الطلب) */
  prefillOrder?: PrintOrderLite | null;
  /** عند انتهاء التعديل من تكرار الطلب */
  onPrefillConsumed?: () => void;
}

const STEP_LABELS = ["رفع الملف والتحليل", "إعدادات الطباعة", "وقت التسليم", "معلومات التواصل", "مراجعة الطلب"];
const STEP_DURATIONS = ["أقل من 15 ثانية", "حوالي 30 ثانية", "5 ثوانٍ", "15 ثانية", "10 ثوانٍ"];

export function NewOrderWizard({ onCreated, prefillOrder, onPrefillConsumed }: NewOrderWizardProps) {
  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileDataUrl, setFileDataUrl] = useState<string>(""); // اسم الملف المخزَّن على الخادم
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("idle");
  const [uploadError, setUploadError] = useState<string>("");
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
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>(""); // فترة زمنية: morning/noon/evening
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
      const opts = prefillOrder.options as Record<string, unknown>;
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
      setDeliveryTimeSlot(prefillOrder.delivery.timeSlot || "");
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

  // ═══ تحميل المواصفات ديناميكياً من الإعدادات ═══
  const [dynamicSpecs, setDynamicSpecs] = useState<Record<string, ServiceSpec>>(
    () => Object.fromEntries(Object.entries(STATIC_SERVICE_SPECS).map(([k, v]) => [k, v]))
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: AppSettings) => {
        if (data.services?.length) {
          const map: Record<string, ServiceSpec> = {};
          for (const s of data.services) {
            map[s.type] = s;
          }
          setDynamicSpecs(map);
        }
      })
      .catch(() => {
        // فشل التحميل — نستخدم الافتراضي
      });
  }, []);

  const selectedService = useMemo(
    () => dynamicSpecs[serviceType || ""] || STATIC_SERVICES.find((s) => s.type === serviceType) || null,
    [serviceType, dynamicSpecs],
  );

  const currentSpec = useMemo<ServiceSpec | null>(
    () => (serviceType ? (dynamicSpecs[serviceType] || null) : null),
    [serviceType, dynamicSpecs],
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
        // لا تُرجع cleanup function لتجنب إلغاء الـ timeout
        return () => {};
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
      spec: dynamicSpecs[serviceType],
    });
  }, [serviceType, pages, copies, deliveryMode, specOptions, dynamicSpecs]);

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
    };
  }, [pricing, appliedOffer]);

  const estimatedHours = useMemo(() => {
    return estimateDeliveryHours(deliveryMode, pages, copies);
  }, [deliveryMode, pages, copies]);

  // ===== حساب الوقت المقدّر للتسليم (ساعة محددة) =====
  const deliveryEstimate = useMemo(() => {
    const now = new Date();
    const hours = estimatedHours;
    const readyTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // ساعات العمل: 8 صباحاً - 8 مساءً
    const WORK_START = 8;
    const WORK_END = 20;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // إذا كان الوقت الحالي خارج ساعات العمل، نبدأ الحساب من بداية العمل القادمة
    let effectiveStart = new Date(now);
    if (currentHour >= WORK_END || currentHour < WORK_START) {
      // قبل 8 صباحاً أو بعد 8 مساءً: يبدأ من 8 صباحاً
      effectiveStart.setHours(WORK_START, 0, 0, 0);
      if (currentHour >= WORK_END) {
        effectiveStart.setDate(effectiveStart.getDate() + 1); // اليوم التالي
      }
    }

    // حساب الوقت الجاهز مع تجاهل ساعات الليل
    let tempEnd = new Date(effectiveStart);
    let remainingMinutes = hours * 60;
    while (remainingMinutes > 0) {
      const endOfDay = new Date(tempEnd);
      endOfDay.setHours(WORK_END, 0, 0, 0);
      const minutesToEndOfDay = Math.max(0, (endOfDay.getTime() - tempEnd.getTime()) / 60000);

      if (remainingMinutes <= minutesToEndOfDay) {
        tempEnd = new Date(tempEnd.getTime() + remainingMinutes * 60000);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= minutesToEndOfDay;
        tempEnd.setDate(tempEnd.getDate() + 1);
        tempEnd.setHours(WORK_START, 0, 0, 0);
      }
    }

    // تنسيق الوقت بالعربية
    const formatTime = (d: Date) => {
      const h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, "0");
      if (h === 0) return `12:${m} صباحاً`;
      if (h < 12) return `${h}:${m} صباحاً`;
      if (h === 12) return `12:${m} مساءً`;
      return `${h - 12}:${m} مساءً`;
    };

    const formatDate = (d: Date) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dStr = d.toDateString();
      if (dStr === today.toDateString()) return "اليوم";
      if (dStr === tomorrow.toDateString()) return "غداً";
      return d.toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "short" });
    };

    // نسبة التقدم البصري (0-100)
    const totalWorkMinutes = (WORK_END - WORK_START) * 60;
    const elapsed = (Math.min(currentHour, WORK_END) - WORK_START) * 60 + (currentHour < WORK_END ? currentMin : 0);
    const dayProgress = currentHour >= WORK_END ? 100 : Math.max(0, Math.min(100, (elapsed / totalWorkMinutes) * 100));

    // الفترات الزمنية المتاحة
    const getAvailableSlots = (): { id: string; label: string; time: string; icon: typeof Sun; available: boolean; earliest?: string }[] => {
      const slots = [
        { id: "morning", label: "الصباح", time: "8:00 - 12:00", icon: Sun },
        { id: "noon", label: "الظهيرة", time: "12:00 - 16:00", icon: Clock },
        { id: "evening", label: "المساء", time: "16:00 - 20:00", icon: Moon },
      ];

      // عند اختيار "غداً" كل الفترات متاحة لأن الزبون يحدد يوم كامل
      if (deliveryMode === "tomorrow") {
        return slots.map((s) => ({ ...s, available: true, earliest: "" }));
      }

      // نهايات الفترات بالساعة (بالتوقيت 24 ساعة)
      const slotEndHours: Record<string, number> = { morning: 12, noon: 16, evening: 20 };
      const readyHour = tempEnd.getHours();

      // هل الطلب سيُنجز اليوم أم غداً؟
      const todayStr = now.toDateString();
      const readyDateStr2 = tempEnd.toDateString();
      const isReadyToday = readyDateStr2 === todayStr;

      return slots.map((s) => {
        let available = false;
        let earliest = "";

        if (deliveryMode === "today") {
          // للتسليم اليوم: نتحقق من أن الفترة لم تنتهِ بعد (بناءً على الوقت الحالي)
          // وأن الطلب سيكون جاهزاً قبل نهاية هذه الفترة
          const slotEnd = slotEndHours[s.id];
          const currentTotalMinutes = currentHour * 60 + currentMin;
          const slotEndMinutes = slotEnd * 60;

          if (currentTotalMinutes < slotEndMinutes && isReadyToday && readyHour <= slotEnd) {
            available = true;
            earliest = formatTime(tempEnd);
          } else if (!isReadyToday) {
            // الطلب سيكون جاهزاً غداً - لا يمكن تسليمه "اليوم"
            available = false;
          }
        } else if (deliveryMode === "hour") {
          // التسليم خلال ساعة: نتحقق أن الفترة لم تنتهِ بعد والطلب جاهز خلالها
          const slotEnd = slotEndHours[s.id];
          const currentTotalMinutes = currentHour * 60 + currentMin;
          const slotEndMinutes = slotEnd * 60;

          if (currentTotalMinutes < slotEndMinutes && isReadyToday && readyHour <= slotEnd) {
            available = true;
            earliest = formatTime(tempEnd);
          } else if (!isReadyToday) {
            // خارج ساعات العمل - الطلب سيكون جاهزاً في اليوم التالي
            available = false;
          }
        }

        return { ...s, available, earliest };
      });
    };

    // هل التسليم "اليوم" متاحًا؟ (خارج ساعات العمل لا يمكن التسليم اليوم)
    const isTodayDeliveryPossible = currentHour >= WORK_START && currentHour < WORK_END;
    const isHourDeliveryPossible = currentHour >= WORK_START && currentHour < WORK_END;

    return {
      readyTime: tempEnd,
      readyTimeStr: formatTime(tempEnd),
      readyDateStr: formatDate(tempEnd),
      currentStr: formatTime(now),
      dayProgress,
      timeSlots: getAvailableSlots(),
      isWorkingHours: currentHour >= WORK_START && currentHour < WORK_END,
      isTodayDeliveryPossible,
      isHourDeliveryPossible,
      workStart: "8:00 صباحاً",
      workEnd: "8:00 مساءً",
    };
  }, [deliveryMode, estimatedHours]);

  // تبديل تلقائي من "اليوم"/"خلال ساعة" إلى "غداً" خارج ساعات العمل
  useEffect(() => {
    if (step === 2 && !deliveryEstimate.isWorkingHours) {
      if (deliveryMode === "today" || deliveryMode === "hour") {
        setDeliveryMode("tomorrow");
        setDeliveryTimeSlot("");
      }
    }
  }, [step, deliveryEstimate.isWorkingHours, deliveryMode]);

  const visibleServices = showAllServices
    ? Object.values(dynamicSpecs)
    : Object.values(dynamicSpecs).slice(0, 3);

  function canProceed(): boolean {
    if (step === 0) return !!serviceType;
    if (step === 1 && printRange === "custom") return pages > 0;
    if (step === 2) {
      if (!deliveryMode) return false;
      if (deliveryMode === "scheduled" && !deliveryDate) return false;
      return true;
    }
    if (step === 3) {
      if (!custName.trim() || !custPhone.trim()) return false;
      if (!isValidAlgerianPhone(custPhone)) return false;
      if (custWhatsapp.trim() && !isValidAlgerianPhone(custWhatsapp)) return false;
      if (custDelivery === "delivery" && !custAddress.trim()) return false;
      return true;
    }
    return true;
  }

  async function processFile(f: File) {
    // التحقق من الصيغة
    const ACCEPTED = [".pdf", ".docx", ".jpg", ".jpeg", ".png", ".webp"];
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED.includes(`.${ext}`)) {
      setAnalysisPhase("error");
      setUploadError(`صيغة الملف ".${ext}" غير مدعومة. الصيغ المدعومة: ${ACCEPTED.join(", ")}`);
      return;
    }
    // التحقق من الحجم
    if (f.size > 50 * 1024 * 1024) {
      setAnalysisPhase("error");
      setUploadError(`حجم الملف ${(f.size / (1024 * 1024)).toFixed(1)} ميغابايت يتجاوز الحد الأقصى (50 ميغابايت)`);
      return;
    }
    if (f.size === 0) {
      setAnalysisPhase("error");
      setUploadError("الملف فارغ — يرجى اختيار ملف آخر");
      return;
    }

    setFileName(f.name);
    setFileType(ext.toUpperCase());
    setFileSize(f.size);
    setFileDataUrl("");
    setUploadError("");

    // ─── المرحلة 1: رفع الملف ───
    setAnalysisPhase("uploading");
    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const CHUNK_THRESHOLD = 900 * 1024; // 900 كيلوبايت
      const CHUNK_SIZE = 900 * 1024;

      let storedFileName: string;

      if (f.size <= CHUNK_THRESHOLD) {
        // ملف صغير — رفع مباشر
        const formData = new FormData();
        formData.append("file", f);

        storedFileName = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/orders/upload");

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.storedFileName);
            } else {
              let msg = `فشل رفع الملف — رمز الخطأ: ${xhr.status}`;
              try { const d = JSON.parse(xhr.responseText); if (d.error) msg = d.error; } catch {}
              reject(new Error(msg));
            }
          };

          xhr.onerror = () => reject(new Error("خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت."));
          xhr.send(formData);
        });
      } else {
        // ملف كبير — رفع مجزأ (لتجاوز حد 1 ميغا في البوابة)
        const fileId = crypto.randomUUID();
        const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
        let overallLoaded = 0;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, f.size);
          const blob = f.slice(start, end);

          const formData = new FormData();
          formData.append("chunk", blob, `chunk_${i}`);
          formData.append("fileId", fileId);
          formData.append("chunkIndex", String(i));
          formData.append("totalChunks", String(totalChunks));
          formData.append("fileName", f.name);
          formData.append("fileSize", String(f.size));
          formData.append("fileExt", ext);

          const result = await new Promise<{ complete: boolean; storedFileName?: string; error?: string }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/orders/upload-chunk");

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const chunkPct = e.loaded / e.total;
                const pct = Math.round(((overallLoaded + start + e.loaded) / f.size) * 100);
                setUploadProgress(Math.min(pct, 99));
              }
            };

            xhr.onload = () => {
              if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                let msg = `فشل رفع الجزء ${i + 1}/${totalChunks} — رمز الخطأ: ${xhr.status}`;
                try { const d = JSON.parse(xhr.responseText); if (d.error) msg = d.error; } catch {}
                reject(new Error(msg));
              }
            };

            xhr.onerror = () => reject(new Error(`خطأ في الاتصال أثناء رفع الجزء ${i + 1}/${totalChunks}`));
            xhr.send(formData);
          });

          overallLoaded = end;

          if (result.complete && result.storedFileName) {
            storedFileName = result.storedFileName;
          }
        }
        // إذا لم نحصل على storedFileName من آخر جزء
        if (!storedFileName) {
          throw new Error("فشل في تجميع الملف. حاول مرة أخرى.");
        }
      }

      setFileDataUrl(storedFileName);
      setUploadProgress(100);
      setUploadStatus("done");
    } catch (uploadErr) {
      setAnalysisPhase("error");
      setUploadError((uploadErr as Error).message || "فشل رفع الملف");
      setUploadStatus("error");
      return;
    }

    // ─── المرحلة 2: التحليل المحلي ───
    setAnalyzing(true);
    setAnalysis(null);
    setAnalysisPhase("local-analysis");

    try {
      const basicResult = await analyzeFileReal(f);

      // عرض النتيجة الأساسية فوراً
      setAnalysis(basicResult);
      setTotalPages(basicResult.pageCount);
      setPages(basicResult.pageCount);
      setPrintRange("all");
      setPageRange("");
      setServiceType(basicResult.detectedService);

      // تطبيق التوصيات الأساسية
      const spec = dynamicSpecs[basicResult.detectedService] || STATIC_SERVICE_SPECS[basicResult.detectedService];
      const defaults: Record<string, string> = {};
      if (spec) {
        spec.sections.forEach((section) => {
          if (section.optionKey === "color" && basicResult.suggestedColor) {
            defaults.color = basicResult.suggestedColor;
          } else if (section.optionKey === "paperSize" && basicResult.suggestedPaperSize) {
            defaults.paperSize = basicResult.suggestedPaperSize;
          } else if (section.optionKey === "paperType" && basicResult.suggestedPaperType) {
            defaults.paperType = basicResult.suggestedPaperType;
          } else if (section.optionKey === "binding" && basicResult.suggestedBinding) {
            defaults.binding = basicResult.suggestedBinding;
          } else if (section.options.length > 0) {
            defaults[section.optionKey] = section.options[0].id;
          }
        });
      }
      setSpecOptions(defaults);

      toast.success("اكتمل التحليل الأساسي", {
        description: `${basicResult.detectedServiceName} · ${basicResult.pageCount} صفحة`,
      });

      // ─── المرحلة 3: التحليل الذكي بالـ VLM ───
      setAnalysisPhase("ai-analysis");

      analyzeFileWithAI(f, basicResult).then(({ vlmAnalysis, enhancedAnalysis }) => {
        if (vlmAnalysis) {
          setAnalysis(enhancedAnalysis);
          setServiceType(enhancedAnalysis.detectedService as ServiceType);
          setTotalPages(enhancedAnalysis.pageCount);
          setPages(enhancedAnalysis.pageCount);

          const updatedSpec = dynamicSpecs[enhancedAnalysis.detectedService] || STATIC_SERVICE_SPECS[enhancedAnalysis.detectedService as ServiceType];
          const updatedDefaults: Record<string, string> = {};
          if (updatedSpec) {
            updatedSpec.sections.forEach((section) => {
              if (section.optionKey === "color" && enhancedAnalysis.suggestedColor) {
                updatedDefaults.color = enhancedAnalysis.suggestedColor;
              } else if (section.optionKey === "paperSize" && enhancedAnalysis.suggestedPaperSize) {
                updatedDefaults.paperSize = enhancedAnalysis.suggestedPaperSize;
              } else if (section.optionKey === "paperType" && enhancedAnalysis.suggestedPaperType) {
                updatedDefaults.paperType = enhancedAnalysis.suggestedPaperType;
              } else if (section.optionKey === "binding" && enhancedAnalysis.suggestedBinding) {
                updatedDefaults.binding = enhancedAnalysis.suggestedBinding;
              } else if (section.options.length > 0) {
                updatedDefaults[section.optionKey] = section.options[0].id;
              }
            });
          }
          setSpecOptions(updatedDefaults);

          toast.success("🤖 تم التحليل الذكي", {
            description: `${vlmAnalysis.documentType} · ${vlmAnalysis.qualityAssessment} · دقة ${vlmAnalysis.confidence}%`,
          });
        }
        setAnalysisPhase("done");
      }).catch(() => {
        // VLM فشل — التحليل الأساسي كافٍ
        setAnalysisPhase("done");
      });
    } catch (err) {
      setAnalysisPhase("error");
      setUploadError((err as Error).message || "تعذّر تحليل الملف. تأكد أن الملف غير تالف.");
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
          fileData: fileDataUrl || null,
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
          delivery: { mode: deliveryMode, date: deliveryDate, timeSlot: deliveryTimeSlot },
          // السعر النهائي بعد تطبيق العرض
          finalTotal: finalPricing.total,
          appliedOfferCode: appliedOffer?.code || null,
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
      setAnalysisPhase("idle");
      setUploadError("");
      setUploadStatus("idle");
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
  function handleServiceSelect(type: string) {
    setServiceType(type as ServiceType);
    const spec = dynamicSpecs[type] || STATIC_SERVICE_SPECS[type as ServiceType];
    const defaults: Record<string, string> = {};
    if (spec) {
      spec.sections.forEach((section) => {
        if (section.options.length > 0) {
          defaults[section.optionKey] = section.options[0].id;
        }
      });
    }
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

        {/* ===== الخطوة 0: رفع الملف والتحليل المحسّن ===== */}
        {step === 0 && (
          <UploadStep
            fileName={fileName}
            fileType={fileType}
            fileSize={fileSize}
            analysisPhase={analysisPhase}
            uploadProgress={uploadProgress}
            analysis={analysis}
            analyzing={analyzing}
            serviceType={serviceType}
            errorMessage={uploadError}
            onFileSelected={processFile}
          />
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
            {currentSpec && currentSpec.sections.map((section, sectionIdx) => {
              const selectedId = specOptions[section.optionKey];
              const isSelectedOpt = section.options.find((o) => o.id === selectedId);
              const isExtra = sectionIdx >= 3; // الأقسام بعد الثالث قابلة للطي
              const priceImpact = isSelectedOpt
                ? (() => {
                    if (isSelectedOpt.price && isSelectedOpt.price > 0) return `+${formatDA(isSelectedOpt.price)}/نسخة`;
                    if (isSelectedOpt.pricePerPage && isSelectedOpt.pricePerPage > 0) return `+${formatDA(isSelectedOpt.pricePerPage)}/صفحة`;
                    if (isSelectedOpt.multiplier && isSelectedOpt.multiplier !== 1) return `×${isSelectedOpt.multiplier}`;
                    return undefined;
                  })()
                : undefined;
              const cols = section.options.length === 2 ? "grid-cols-2" :
                           section.options.length === 3 ? "grid-cols-3" :
                           section.options.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                           section.options.length === 5 ? "grid-cols-2 md:grid-cols-5" :
                           "grid-cols-2 md:grid-cols-3";
              return (
                <Section
                  key={section.id}
                  title={section.title}
                  hint={section.hint}
                  collapsible={isExtra}
                  defaultOpen={sectionIdx < 5}
                  badge={isExtra && isSelectedOpt && priceImpact ? priceImpact : undefined}
                  priceImpact={isExtra && priceImpact ? priceImpact : undefined}
                >
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
          <div className="space-y-5">
            {/* شريط حالة اليوم والتقدم */}
            <div className="rounded-2xl bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${deliveryEstimate.isWorkingHours ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className="text-xs font-medium text-amber-900">
                    {deliveryEstimate.isWorkingHours ? "مفتوح الآن" : "مغلق — يبدأ من 8 صباحاً"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-800">
                  <Timer className="h-3.5 w-3.5" />
                  <span>الآن {deliveryEstimate.currentStr}</span>
                </div>
              </div>
              <div className="relative h-2 rounded-full bg-amber-200/60 overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${deliveryEstimate.dayProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-amber-700">{deliveryEstimate.workStart}</span>
                <span className="text-[10px] text-amber-700">{deliveryEstimate.workEnd}</span>
              </div>
            </div>

            {/* خيارات سرعة التسليم */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                متى تحتاج طلبك؟
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DELIVERY_OPTIONS.map((d) => {
                  const isSelected = deliveryMode === d.id;
                  // حساب الوقت المتوقع لكل خيار
                  const optHours = estimateDeliveryHours(d.id, pages, copies);
                  const optReady = new Date(Date.now() + optHours * 3600000);
                  const readyH = optReady.getHours();
                  const readyM = optReady.getMinutes().toString().padStart(2, "0");
                  const readyStr = readyH === 0 ? `12:${readyM} ص` : readyH < 12 ? `${readyH}:${readyM} ص` : readyH === 12 ? `12:${readyM} م` : `${readyH - 12}:${readyM} م`;

                  // تعطيل "اليوم" و"خلال ساعة" خارج ساعات العمل
                  const isDisabled = (d.id === "today" && !deliveryEstimate.isTodayDeliveryPossible)
                    || (d.id === "hour" && !deliveryEstimate.isHourDeliveryPossible);

                  return (
                    <button
                      key={d.id}
                      onClick={() => { if (!isDisabled) { setDeliveryMode(d.id); setDeliveryTimeSlot(""); } }}
                      className={`relative p-3.5 rounded-2xl border-2 text-right transition-all duration-200 ${
                        isDisabled
                          ? "border-border bg-muted/40 opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "border-amber-500 bg-amber-50 shadow-md shadow-amber-200/50 scale-[1.02]"
                          : "border-border bg-card hover:border-amber-300 hover:shadow-sm"
                      }`}
                      disabled={isDisabled}
                    >
                      {d.badge && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                          {d.badge}
                        </span>
                      )}
                      {isDisabled && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-400 text-white">
                          مغلق
                        </span>
                      )}
                      <div className="text-2xl mb-1.5">{d.emoji}</div>
                      <div className="font-bold text-sm leading-tight">{d.label}</div>
                      {isDisabled ? (
                        <div className="text-[11px] mt-1 text-rose-500 font-medium">غير متاح الآن</div>
                      ) : (
                        <div className={`text-[11px] mt-1 font-semibold ${isSelected ? "text-amber-700" : "text-muted-foreground"}`}>
                          ≈ {readyStr}
                        </div>
                      )}
                      {d.surcharge > 0 && !isDisabled && (
                        <div className="text-[11px] text-rose-600 font-bold mt-0.5">+{formatDA(d.surcharge)}</div>
                      )}
                    </button>
                  );
                })}
              </div>
              {!deliveryEstimate.isWorkingHours && (deliveryMode === "today" || deliveryMode === "hour") && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <span>المطبعة مغلقة حالياً — اختر <strong>غداً</strong> أو <strong>تاريخ محدد</strong> للتسليم</span>
                </div>
              )}
            </div>

            {/* الفترات الزمنية (لليوم وغداً) */}
            {(deliveryMode === "today" || deliveryMode === "tomorrow" || deliveryMode === "hour") && (
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  اختر الفترة الزمنية المفضلة
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {deliveryEstimate.timeSlots.map((slot) => {
                    const SlotIcon = slot.icon;
                    const isSelected = deliveryTimeSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setDeliveryTimeSlot(slot.id)}
                        className={`p-3.5 rounded-xl border-2 text-center transition-all duration-200 ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 shadow-sm"
                            : slot.available
                            ? "border-border bg-card hover:border-amber-300"
                            : "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                        }`}
                        disabled={!slot.available}
                      >
                        <SlotIcon className={`h-5 w-5 mx-auto mb-1.5 ${isSelected ? "text-amber-600" : "text-muted-foreground"}`} />
                        <div className={`text-xs font-bold ${isSelected ? "text-amber-800" : ""}`}>{slot.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{slot.time}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* اختيار تاريخ محدد */}
            {deliveryMode === "scheduled" && (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  اختر تاريخ التسليم
                </Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-2 max-w-xs"
                />
              </div>
            )}

            {/* ملخص التسليم المتوقع */}
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${
              deliveryMode === "hour"
                ? "bg-rose-50 border-rose-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <div className={`mt-0.5 p-2 rounded-lg ${
                deliveryMode === "hour" ? "bg-rose-100" : "bg-emerald-100"
              }`}>
                {deliveryMode === "hour" ? (
                  <Zap className={`h-4 w-4 ${deliveryMode === "hour" ? "text-rose-600" : "text-emerald-600"}`} />
                ) : (
                  <Clock className={`h-4 w-4 text-emerald-600`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-neutral-900">
                  {deliveryMode === "hour" && "تسليم عاجل"}
                  {deliveryMode === "today" && "تسليم اليوم"}
                  {deliveryMode === "tomorrow" && "تسليم غداً"}
                  {deliveryMode === "scheduled" && "تسليم في تاريخ محدد"}
                </div>
                <div className="text-xs text-neutral-600 mt-1">
                  {deliveryMode === "scheduled" && deliveryDate ? (
                    <>الاستلام: <strong>{deliveryDate}</strong></>
                  ) : (
                    <>
                      التوقيت المقدّر: <strong className="text-base">{deliveryEstimate.readyTimeStr}</strong>{" "}
                      — {deliveryEstimate.readyDateStr}
                      <span className="text-muted-foreground"> ({estimatedHours} ساعة عمل)</span>
                    </>
                  )}
                </div>
                {deliveryTimeSlot && (
                  <div className="text-xs text-amber-700 font-medium mt-1">
                    الفترة المفضلة: {deliveryEstimate.timeSlots.find(s => s.id === deliveryTimeSlot)?.label}
                  </div>
                )}
              </div>
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
                    <SummaryRow
                      label="التسليم"
                      value={
                        deliveryTimeSlot
                          ? `${DELIVERY_OPTIONS.find((d) => d.id === deliveryMode)?.label} — ${deliveryEstimate.timeSlots.find(s => s.id === deliveryTimeSlot)?.label}`
                          : DELIVERY_OPTIONS.find((d) => d.id === deliveryMode)?.label
                      }
                    />
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
  collapsible,
  defaultOpen = true,
  badge,
  priceImpact,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: string;
  priceImpact?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `section-${title.replace(/\s/g, "-")}`;

  if (!collapsible) {
    return (
      <div>
        <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
          <Label className="text-base font-semibold">{title}</Label>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold border border-amber-200">
                {badge}
              </span>
            )}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold cursor-pointer">{title}</Label>
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold border border-amber-200">
              {badge}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground hidden sm:inline">— {hint}</span>}
        </div>
        <div className="flex items-center gap-2">
          {priceImpact && (
            <span className="text-xs font-bold text-emerald-600">{priceImpact}</span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div id={contentId} className="px-4 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
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
