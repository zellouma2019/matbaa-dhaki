import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/default-settings";
import { withRateLimit } from "@/lib/rate-limit";

async function upsertSetting(key: string, value: string, shopId?: string) {
  if (shopId) {
    // When shopId is provided, use the compound unique for upsert
    return db.setting.upsert({
      where: { shopId_key: { shopId, key } },
      update: { value },
      create: { key, value, shopId },
    });
  }
  // When no shopId (global settings), use findFirst + create/update
  // because compound unique type doesn't accept null for shopId
  const existing = await db.setting.findFirst({ where: { key, shopId: null } });
  if (existing) {
    return db.setting.update({ where: { id: existing.id }, data: { value } });
  }
  return db.setting.create({ data: { key, value } });
}

/// الحصول على الإعدادات (يُنشئ الافتراضية إن لم تكن موجودة)
export async function GET(req: NextRequest) {
  const rl = withRateLimit(req, "settings");
  if (!rl.ok) return rl.response;
  try {
    const shopId = req.nextUrl.searchParams.get("shopId");
    const rows = await db.setting.findMany({
      where: shopId ? { shopId } : { shopId: null },
    });
    const settings: AppSettings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);
        if (row.key === "services") settings.services = parsed;
        else if (row.key === "deliveryOptions") settings.deliveryOptions = parsed;
        else if (row.key === "general") settings.general = { ...settings.general, ...parsed };
        else if (row.key === "intro") settings.intro = { ...settings.intro, ...parsed };
      } catch {}
    }
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/// تحديث الإعدادات (يتطلب كود الإدارة)
export async function PUT(req: NextRequest) {
  const rl = withRateLimit(req, "settings");
  if (!rl.ok) return rl.response;
  try {
    const body = await req.json();
    const { services, deliveryOptions, general, intro, shopId } = body as AppSettings & { shopId?: string };

    const updates: Promise<unknown>[] = [];
    if (services) {
      updates.push(upsertSetting("services", JSON.stringify(services), shopId));
    }
    if (deliveryOptions) {
      updates.push(upsertSetting("deliveryOptions", JSON.stringify(deliveryOptions), shopId));
    }
    if (general) {
      updates.push(upsertSetting("general", JSON.stringify(general), shopId));
    }
    if (intro) {
      updates.push(upsertSetting("intro", JSON.stringify(intro), shopId));
    }
    await Promise.all(updates);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/// إعادة التعيين للإعدادات الافتراضية
export async function DELETE(req: NextRequest) {
  const rl = withRateLimit(req, "settings");
  if (!rl.ok) return rl.response;
  try {
    const shopId = req.nextUrl.searchParams.get("shopId");
    await db.setting.deleteMany({
      where: shopId ? { shopId } : { shopId: null },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}