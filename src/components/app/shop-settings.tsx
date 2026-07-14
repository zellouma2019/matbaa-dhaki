"use client";

import { useState, useEffect } from "react";
import { useShop } from "@/lib/shop-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Store, Phone, Mail, MapPin, Palette, MessageCircle, User } from "lucide-react";

interface ShopSettingsProps {
  slug: string;
  onSaved?: () => void;
  initiallyUnlocked?: boolean;
  verifiedPin?: string;
}

export function ShopSettings({ slug, onSaved, initiallyUnlocked, verifiedPin }: ShopSettingsProps) {
  const { shop } = useShop();
  const [pin, setPin] = useState(verifiedPin || "");
  const [unlocked, setUnlocked] = useState(!!initiallyUnlocked);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    primaryColor: "",
    ownerName: "",
    ownerPhone: "",
  });

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name || "",
        phone: shop.phone || "",
        whatsapp: shop.whatsapp || "",
        email: shop.email || "",
        address: shop.address || "",
        primaryColor: shop.primaryColor || "",
        ownerName: shop.ownerName || "",
        ownerPhone: shop.ownerPhone || "",
      });
    }
  }, [shop]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    try {
      const res = await fetch(`/api/shops/${slug}`);
      const d = await res.json();
      if (d.shop && d.shop.adminPin === pin) {
        setUnlocked(true);
      } else {
        toast.error("كلمة المرور غير صحيحة");
      }
    } catch {
      toast.error("خطأ في التحقق");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: pin, ...form }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "فشل الحفظ");
      }
      toast.success("تم حفظ الإعدادات بنجاح");
      onSaved?.();
    } catch (err) {
      toast.error("فشل الحفظ", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (!unlocked) {
    return (
      <Card className="max-w-sm mx-auto mt-12">
        <CardContent className="p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center mx-auto mb-3">
              <Store className="h-6 w-6 text-amber-400" />
            </div>
            <h2 className="font-bold text-lg">إعدادات المتجر</h2>
            <p className="text-xs text-muted-foreground mt-1">أدخل كلمة المرور للوصول</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-3">
            <Input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="كلمة مرور الإدارة"
              dir="ltr"
              className="text-center text-lg tracking-widest"
              required
            />
            <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
          <Store className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="font-bold text-lg">إعدادات المتجر</h2>
          <p className="text-xs text-muted-foreground">خصّص متجرك حسب احتياجاتك</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* معلومات المتجر */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-600" />
              معلومات المتجر
            </h3>
            <div>
              <Label>اسم المتجر</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />واتساب</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />البريد الإلكتروني</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />العنوان</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المظهر */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-amber-600" />
              المظهر
            </h3>
            <div>
              <Label>اللون الرئيسي</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.primaryColor || "#171717"}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  placeholder="#171717"
                  className="flex-1"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* معلومات المالك */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              معلومات المالك
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>الاسم</Label>
                <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className="mt-1" dir="ltr" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </form>
    </div>
  );
}