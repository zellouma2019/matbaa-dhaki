"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShopProvider, useShop } from "@/lib/shop-context";
import { AppShell } from "@/components/app/app-shell";
import { MerchantDashboard } from "@/components/app/merchant-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Store } from "lucide-react";

function ShopLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">جارٍ تحميل المتجر...</p>
      </div>
    </div>
  );
}

function ShopNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="py-12">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">المتجر غير موجود</h2>
          <p className="text-sm text-muted-foreground">
            تأكد من صحة الرابط أو تواصل مع صاحب المتجر
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ShopAppInner({ slug }: { slug: string }) {
  const { shop, loading, error } = useShop();
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "1";

  if (loading) return <ShopLoader />;
  if (error || !shop) return <ShopNotFound />;

  // لوحة التحكم الخاصة بالتاجر (صاحب المتجر)
  if (isAdmin) {
    return (
      <MerchantDashboard
        shopId={shop.id}
        shopSlug={slug}
      />
    );
  }

  // واجهة الزبون فقط (تقديم طلبات)
  return (
    <AppShell
      shopId={shop.id}
      shopName={shop.name}
      shopPhone={shop.phone}
      shopWhatsapp={shop.whatsapp}
      shopEmail={shop.email}
      shopAddress={shop.address}
      shopColor={shop.primaryColor}
      shopThemeId={shop.themeId}
      shopSlug={slug}
    />
  );
}

function ShopApp({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<ShopLoader />}>
      <ShopAppInner slug={slug} />
    </Suspense>
  );
}

export function ShopPage({ slug }: { slug: string }) {
  return (
    <ShopProvider slug={slug}>
      <ShopApp slug={slug} />
    </ShopProvider>
  );
}