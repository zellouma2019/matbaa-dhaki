"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

interface AdminGateProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminGate({ open, onClose, onSuccess }: AdminGateProps) {
  const [code, setCode] = useState("");
  const [adminCode, setAdminCode] = useState(DEFAULT_SETTINGS.general.adminCode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading when dialog reopens
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const general = data.general || data.find?.((s: { key: string }) => s.key === "general")?.value;
        if (general?.adminCode) setAdminCode(general.adminCode);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code === adminCode) {
      toast.success("تم التحقق من الكود بنجاح", {
        description: "مرحباً بك في لوحة الإدارة",
      });
      setCode("");
      setError(false);
      setAttempts(0);
      onSuccess();
    } else {
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
            أدخل الكود السري للوصول إلى لوحة الإدارة
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
                maxLength={4}
                inputMode="numeric"
                autoFocus
                dir="ltr"
              />

              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  كود خاطئ — حاول مرة أخرى
                </div>
              )}

              <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-12" disabled={code.length < 4}>
                <ShieldCheck className="h-4 w-4" />
                دخول
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            🔒 هذا القسم مخصص للموظفين المصرح لهم فقط
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}