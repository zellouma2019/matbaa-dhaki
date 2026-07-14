"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AdminGateProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
  /** إذا كان في سياق متجر: يتم التحقق من PIN المتجر */
  shopSlug?: string | null;
  /** كود PIN ثابت (للوحة العامة بدون متاجر) */
  staticPin?: string | null;
}

const DEFAULT_PIN = "2514";

export function AdminGate({ open, onClose, onSuccess, shopSlug, staticPin }: AdminGateProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;

    // إذا كان هناك متجر، تحقق من الـ API
    if (shopSlug) {
      setVerifying(true);
      try {
        const res = await fetch(`/api/shops/${encodeURIComponent(shopSlug)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminPin: code }),
        });
        if (res.ok) {
          toast.success("مرحباً بك في لوحة الإدارة");
          const enteredCode = code;
          resetAndClose();
          onSuccess(enteredCode);
        } else {
          handleWrong();
        }
      } catch {
        handleWrong();
      } finally {
        setVerifying(false);
      }
      return;
    }

    // بدون متجر: كود ثابت
    const expectedPin = staticPin || DEFAULT_PIN;
    if (code === expectedPin) {
      toast.success("تم التحقق من الكود بنجاح", {
        description: "مرحباً بك في لوحة الإدارة",
      });
      const enteredCode = code;
      resetAndClose();
      onSuccess(enteredCode);
    } else {
      handleWrong();
    }
  }

  function handleWrong() {
    setError(true);
    setAttempts((a) => a + 1);
    toast.error("كود خاطئ", {
      description: attempts >= 2 ? "محاولة أخيرة قبل القفل المؤقت" : `المتبقي ${3 - attempts - 1} محاولات`,
    });
    setCode("");
    if (attempts >= 2) {
      setTimeout(() => {
        setAttempts(0);
        setError(false);
      }, 5000);
    }
  }

  function resetAndClose() {
    setCode("");
    setError(false);
    setAttempts(0);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">كود الدخول للإدارة</DialogTitle>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold mb-1">قسم محمي</h2>
          <p className="text-sm text-muted-foreground mb-6">
            أدخل كلمة المرور للوصول إلى لوحة الإدارة
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              placeholder="• • • •"
              className={`text-center text-2xl font-mono tracking-[0.5em] h-14 ${
                error ? "border-destructive bg-destructive/5" : ""
              }`}
              maxLength={10}
              autoFocus
              dir="ltr"
              disabled={verifying}
            />

            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                كلمة المرور غير صحيحة
              </div>
            )}

            <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-12" disabled={code.length < 1 || verifying}>
              <ShieldCheck className="h-4 w-4" />
              {verifying ? "جارٍ التحقق..." : "دخول"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            🔒 هذا القسم مخصص لصاحب المتجر فقط
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}