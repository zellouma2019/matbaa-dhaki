// حماية خفيفة من الاستخدام المكثف — Rate Limiter في الذاكرة
// لا يحتاج Redis أو أي خدمة خارجية

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

/** مدة النافذة بالمللي ثانية */
const WINDOW_MS = 60_000; // دقيقة واحدة

/**
 * عدد الطلبات المسموح بها في النافذة حسب نوع العملية
 * POST (إنشاء طلب): 15/دقيقة
 * GET (قراءة): 60/دقيقة
 * PUT/DELETE (تعديل): 30/دقيقة
 */
const LIMITS: Record<string, number> = {
  GET: 60,
  POST: 15,
  PUT: 30,
  DELETE: 30,
};

/**
 * التحقق من حد الطلبات
 */
export function checkRateLimit(
  ip: string,
  method: string,
  endpoint?: string,
): { allowed: boolean; remaining: number; resetIn: number } {
  const limit = LIMITS[method] || 30;
  const key = `${ip}:${method}${endpoint ? `:${endpoint}` : ""}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;

  // تنظيف دوري لمنع تسرب الذاكرة
  if (Math.random() < 0.001) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }

  const remaining = Math.max(0, limit - entry.count);
  const resetIn = Math.max(0, entry.resetAt - now);

  return { allowed: entry.count <= limit, remaining, resetIn };
}

/**
 * استخراج IP من الطلب (يدعم Vercel / proxy)
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Middleware جاهز للتطبيق على API route
 */
export function withRateLimit(
  req: Request,
  endpoint?: string,
): { ok: true } | { ok: false; response: Response } {
  const ip = getClientIp(req);
  const method = req.method;
  const { allowed, remaining, resetIn } = checkRateLimit(ip, method, endpoint);

  if (!allowed) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "طلبات كثيرة جداً. حاول بعد قليل.",
          retryAfter: Math.ceil(resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      ),
    };
  }

  return { ok: true };
}