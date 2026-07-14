import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

const searchCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "الاستعلام قصير جداً (3 أحرف على الأقل)" },
        { status: 400 },
      );
    }

    // التحقق من الكاش
    const cacheKey = query.trim().toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, results: cached.data, cached: true });
    }

    const zai = await ZAI.create();
    const results = await zai.functions.invoke("web_search", {
      query: query.trim(),
      num: 8,
    });

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: "لم يتم العثور على نتائج",
      });
    }

    // تنظيف النتائج
    const clean = results.map((r: Record<string, unknown>, i: number) => ({
      position: i + 1,
      title: r.name || "",
      url: r.url || "",
      description: r.snippet || "",
      domain: r.host_name || "",
      date: r.date || null,
    }));

    // حفظ في الكاش
    searchCache.set(cacheKey, { data: clean, ts: Date.now() });

    return NextResponse.json({ success: true, results: clean, cached: false });
  } catch (error) {
    console.error("[Web Search Error]", error);
    return NextResponse.json(
      { success: false, error: "فشل في البحث. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}