"use client";

import {
  FileText,
  Ruler,
  BookOpen,
  Search,
  Image,
  ClipboardList,
  RefreshCw,
  Ratio,
  Target,
  Palette,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Zap,
  Type,
  Monitor,
} from "lucide-react";
import type { RealFileAnalysis } from "@/lib/file-analyzer";

interface FileAnalysisPanelProps {
  analysis: RealFileAnalysis;
}

/* ─── helpers ─── */

function dpiCategoryColor(cat: string | undefined) {
  switch (cat) {
    case "جاهزة للطباعة":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "عالية":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "متوسطة":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "منخفضة":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    default:
      return "bg-neutral-700/40 text-neutral-400 border-neutral-600/30";
  }
}

function orientationIcon(orientation: string | undefined) {
  switch (orientation) {
    case "عمودي":
      return <Ruler className="h-4 w-4 text-amber-400" />;
    case "أفقي":
      return <RefreshCw className="h-4 w-4 text-amber-400 rotate-90" />;
    case "مربع":
      return <Ratio className="h-4 w-4 text-amber-400" />;
    default:
      return <Ruler className="h-4 w-4 text-neutral-500" />;
  }
}

/* ─── tiny reusable row ─── */

function DataRow({
  icon,
  label,
  value,
  ltr = false,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-neutral-400 text-sm shrink-0">{label}</span>
      <span
        className={`text-white font-medium text-sm truncate ${ltr ? "dir-ltr" : ""}`}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </span>
      {extra && <span className="mr-auto shrink-0">{extra}</span>}
    </div>
  );
}

/* ─── main component ─── */

export default function FileAnalysisPanel({ analysis }: FileAnalysisPanelProps) {
  const a = analysis;

  const fileSizeDisplay = a.fileSizeFormatted
    ? a.fileSizeFormatted
    : a.fileSizeMB >= 1
      ? `${a.fileSizeMB.toFixed(2)} ميغابايت`
      : `${a.fileSizeKB.toFixed(1)} كيلوبايت`;

  const textPreview =
    a.textPreview && a.textPreview.length > 0
      ? a.textPreview.length > 100
        ? a.textPreview.slice(0, 100) + "…"
        : a.textPreview
      : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 lg:grid lg:grid-cols-[1fr_220px] lg:gap-5">
        {/* ─── left column: sections 1-4 ─── */}
        <div className="space-y-0">
          {/* ─── Section 1: الملف الأساسي ─── */}
          <Section title="الملف الأساسي" icon={<FileText className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              <DataRow
                icon={<FileText className="h-4 w-4 text-amber-400" />}
                label="نوع الملف"
                value={a.fileType || "غير معروف"}
              />
              <DataRow
                icon={<Ruler className="h-4 w-4 text-amber-400" />}
                label="حجم الملف"
                value={fileSizeDisplay}
              />
              <DataRow
                icon={<BookOpen className="h-4 w-4 text-amber-400" />}
                label="عدد الصفحات"
                value={String(a.pageCount)}
                ltr
              />
              <DataRow
                icon={<Search className="h-4 w-4 text-amber-400" />}
                label="طبيعة الملف"
                value={a.fileNature || a.detectedServiceName}
              />
            </div>
          </Section>

          {/* ─── Section 2: الأبعاد والمقاس ─── */}
          <Section title="الأبعاد والمقاس" icon={<Ruler className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {a.pageDimensionsMM && (
                <DataRow
                  icon={<Image className="h-4 w-4 text-amber-400" />}
                  label="أبعاد الصفحة"
                  value={`${a.pageDimensionsMM.width} × ${a.pageDimensionsMM.height} مم`}
                  ltr
                />
              )}
              {a.closestPaperSize && (
                <DataRow
                  icon={<ClipboardList className="h-4 w-4 text-amber-400" />}
                  label="أقرب مقاس قياسي"
                  value={a.closestPaperSize}
                  extra={
                    a.closestPaperSize !== "مخصص" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        مطابق
                      </span>
                    ) : undefined
                  }
                />
              )}
              {a.orientation && (
                <DataRow
                  icon={orientationIcon(a.orientation)}
                  label="الاتجاه"
                  value={a.orientation}
                />
              )}
              {a.aspectRatio && (
                <DataRow
                  icon={<Ratio className="h-4 w-4 text-amber-400" />}
                  label="نسبة العرض:الارتفاع"
                  value={a.aspectRatio}
                  ltr
                />
              )}
            </div>
          </Section>

          {/* ─── Section 3: الجودة والألوان ─── */}
          <Section title="الجودة والألوان" icon={<Target className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {a.estimatedDPI != null && (
                <DataRow
                  icon={<Target className="h-4 w-4 text-amber-400" />}
                  label="الدقة المقدّرة"
                  value={`${a.estimatedDPI} DPI`}
                  ltr
                  extra={
                    a.dpiCategory ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${dpiCategoryColor(a.dpiCategory)}`}
                      >
                        {a.dpiCategory}
                      </span>
                    ) : undefined
                  }
                />
              )}
              {a.colorSpace && (
                <DataRow
                  icon={<Palette className="h-4 w-4 text-amber-400" />}
                  label="المساحة اللونية"
                  value={a.colorSpace}
                />
              )}
              <DataRow
                icon={
                  a.hasText ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-600" />
                  )
                }
                label="يحتوي نصوص"
                value={a.hasText ? "نعم" : "لا"}
              />
              <DataRow
                icon={
                  a.hasImages ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-600" />
                  )
                }
                label="يحتوي صور"
                value={a.hasImages ? "نعم" : "لا"}
              />
              {a.dominantColors && a.dominantColors.length > 0 && (
                <div className="sm:col-span-2 flex items-center gap-2.5">
                  <Palette className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-neutral-400 text-sm shrink-0">ألوان سائدة</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {a.dominantColors.map((color, i) => (
                      <span
                        key={i}
                        className="inline-block h-5 w-5 rounded-full border border-neutral-600"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ─── Section 4: توصيات الذكاء الاصطناعي ─── */}
          <Section
            title="توصيات الذكاء الاصطناعي"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            isLast
          >
            {/* service + confidence */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-white font-medium text-sm">
                    {a.detectedServiceName}
                  </span>
                </div>
                <span className="text-amber-400 text-sm font-bold" dir="ltr">
                  {Math.round(a.confidence * 100)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-amber-500 to-amber-300 transition-all duration-500"
                  style={{ width: `${Math.round(a.confidence * 100)}%` }}
                />
              </div>
            </div>

            {/* suggested settings pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {a.suggestedColor && (
                <Pill icon={<Palette className="h-3 w-3" />} label={a.suggestedColor} />
              )}
              {a.suggestedPaperSize && (
                <Pill icon={<FileText className="h-3 w-3" />} label={a.suggestedPaperSize} />
              )}
              {a.suggestedPaperType && (
                <Pill icon={<Type className="h-3 w-3" />} label={a.suggestedPaperType} />
              )}
              {a.suggestedBinding && (
                <Pill icon={<BookOpen className="h-3 w-3" />} label={a.suggestedBinding} />
              )}
            </div>

            {/* insights */}
            {a.insights && a.insights.length > 0 && (
              <ul className="space-y-1.5">
                {a.insights.slice(0, 4).map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">
                      <span role="img" aria-label="insight">
                        💡
                      </span>
                    </span>
                    <span className="text-neutral-300 leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* ─── right column: section 5 (preview) ─── */}
        {a.thumbnailUrl && (
          <div className="mt-4 lg:mt-0 lg:order-none order-first">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                معاينة
              </span>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800">
              <img
                src={a.thumbnailUrl}
                alt={a.fileName || "معاينة الملف"}
                className="w-full h-auto max-h-64 object-contain"
              />
              {a.fileType?.toLowerCase().includes("pdf") && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/80 text-white text-[11px] font-bold backdrop-blur-sm">
                  <Monitor className="h-3 w-3" />
                  PDF
                </span>
              )}
            </div>
            {textPreview && (
              <p className="mt-2 text-xs text-neutral-500 leading-relaxed line-clamp-3">
                {textPreview}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── sub-components ─── */

function Section({
  title,
  icon,
  isLast,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${!isLast ? "border-b border-neutral-800 pb-3 mb-3" : ""}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
      {icon}
      {label}
    </span>
  );
}