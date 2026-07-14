"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  // next-themes يعطي قيمة undefined أثناء SSR
  // نستخدم resolvedTheme بدلاً من theme لتجنب مشاكل SSR
  const isDark = resolvedTheme === "dark";

  // أثناء SSR، resolvedTheme يكون undefined — نعرض زراً افتراضياً
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative w-9 h-9 rounded-full transition-all hover:bg-muted ${
        isDark ? "bg-amber-400/10" : "bg-neutral-900/5"
      } ${className || ""}`}
      aria-label={isDark ? "التبديل للوضع النهاري" : "التبديل للوضع الليلي"}
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      suppressHydrationWarning
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-neutral-700" />
      )}
    </Button>
  );
}
