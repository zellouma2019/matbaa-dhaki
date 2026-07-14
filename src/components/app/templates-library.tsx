"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CalendarDays,
  UserPlus,
  Gauge,
  ShoppingCart,
  ClipboardList,
  Search,
  Plus,
  FileCheck2,
  LayoutGrid,
} from "lucide-react";
import type { FormTemplateT } from "@/lib/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-check-2": FileCheck2,
  "file-text": FileText,
  "calendar-days": CalendarDays,
  "user-plus": UserPlus,
  gauge: Gauge,
  "shopping-cart": ShoppingCart,
  "clipboard-list": ClipboardList,
};

interface TemplatesLibraryProps {
  templates: FormTemplateT[];
  onNewForm: (template: FormTemplateT) => void;
}

export function TemplatesLibrary({ templates, onNewForm }: TemplatesLibraryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category));
    return ["all", ...Array.from(set)];
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchCat = category === "all" || t.category === category;
      const matchSearch =
        !search ||
        t.name.includes(search) ||
        t.code.includes(search) ||
        t.description.includes(search);
      return matchCat && matchSearch;
    });
  }, [templates, search, category]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">مكتبة النماذج الرسمية</h2>
          <p className="text-sm text-muted-foreground">
            اختر النموذج المناسب وابدأ التعبئة مباشرةً
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في النماذج..."
              className="pr-9 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* فلتر التصنيفات */}
      <div className="flex flex-wrap items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted border-border"
            }`}
          >
            {cat === "all" ? "الكل" : cat}
          </button>
        ))}
      </div>

      {/* شبكة النماذج */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            لا توجد نماذج مطابقة لبحثك
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const Icon = ICON_MAP[t.icon] || FileText;
            const isFeatured = t.code === "نموذج 9";
            const fieldCount = t.schema.sections.reduce(
              (a, s) => a + s.fields.length,
              0,
            );
            return (
              <Card
                key={t.id}
                className={`group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  isFeatured ? "border-primary/40 ring-1 ring-primary/20" : ""
                }`}
              >
                {isFeatured && (
                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-br-lg">
                    النموذج الرئيسي
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isFeatured
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {t.code}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-base mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                    {t.description}
                  </p>
                  <div className="flex items-center gap-2 mb-4 text-[10px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted">
                      {t.category}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-muted">
                      {t.schema.sections.length} أقسام
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-muted">
                      {fieldCount} حقل
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => onNewForm(t)}
                  >
                    <Plus className="h-4 w-4" />
                    تعبئة النموذج
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
