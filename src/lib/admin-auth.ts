import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

let cachedCode: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getAdminCode(): Promise<string> {
  const now = Date.now();
  if (cachedCode && now - cacheTime < CACHE_TTL) return cachedCode;

  try {
    const setting = await db.setting.findUnique({ where: { key: "general" } });
    if (setting) {
      const parsed = JSON.parse(setting.value);
      cachedCode = parsed.adminCode || DEFAULT_SETTINGS.general.adminCode;
    } else {
      cachedCode = DEFAULT_SETTINGS.general.adminCode;
    }
  } catch {
    cachedCode = DEFAULT_SETTINGS.general.adminCode;
  }
  cacheTime = now;
  return cachedCode;
}

/**
 * تحقّق من رمز الإدارة المُرسل في الطلب
 * يُستخدم في API routes لحماية مسارات الإدارة
 */
export async function verifyAdminRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("x-admin-code");
  if (!authHeader) return false;

  const correctCode = await getAdminCode();
  return authHeader === correctCode;
}

/**
 * Middleware helper — يُرجع 401 إذا لم يكن الطلب مُصدَّقاً
 */
export async function requireAdmin(request: Request): Promise<{ authorized: boolean; error?: Response }> {
  const isAuthorized = await verifyAdminRequest(request);
  if (!isAuthorized) {
    return {
      authorized: false,
      error: new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { authorized: true };
}