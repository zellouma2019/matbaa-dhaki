import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

const SUPPORTED_SIZES = [
  "1024x1024",
  "768x1344",
  "864x1152",
  "1344x768",
  "1152x864",
  "1440x720",
  "720x1440",
] as const;

export async function POST(req: NextRequest) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "الوصف قصير جداً (5 أحرف على الأقل)" },
        { status: 400 },
      );
    }

    if (!SUPPORTED_SIZES.includes(size)) {
      return NextResponse.json(
        { success: false, error: `الحجم غير مدعوم. الأحجام: ${SUPPORTED_SIZES.join(", ")}` },
        { status: 400 },
      );
    }

    // تحسين البرومبت تلقائياً للطباعة العربية
    const enhancedPrompt = buildPrintPrompt(prompt.trim(), size);

    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt: enhancedPrompt,
      size,
    });

    const imageBase64 = response.data?.[0]?.base64;
    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "لم يتم إنشاء الصورة" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      image: imageBase64,
      size,
      prompt: enhancedPrompt,
    });
  } catch (error) {
    console.error("[Image Gen Error]", error);
    return NextResponse.json(
      { success: false, error: "فشل في إنشاء التصميم. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}

/** تحسين البرومبت ليناسب خدمات المطبعة */
function buildPrintPrompt(userPrompt: string, size: string): string {
  const isLandscape = size.startsWith("1344") || size.startsWith("1152") || size.startsWith("1440");

  const base = [
    "Professional print design",
    userPrompt,
    "high quality",
    "detailed",
    "clean design",
  ];

  if (userPrompt.includes("بطاق") || userPrompt.includes("كارت") || userPrompt.includes("card")) {
    base.push("business card design", "modern typography", "professional layout");
  } else if (userPrompt.includes("ملصق") || userPrompt.includes("بوستر") || userPrompt.includes("poster")) {
    base.push(isLandscape ? "landscape poster format" : "portrait poster format", "eye-catching", "vibrant colors");
  } else if (userPrompt.includes("فلاير") || userPrompt.includes("إعلان") || userPrompt.includes("flyer")) {
    base.push("flyer design", "marketing material", "attractive layout");
  } else if (userPrompt.includes("شعار") || userPrompt.includes("لوجو") || userPrompt.includes("logo")) {
    base.push("logo design", "vector style", "clean lines", "memorable", "minimalist");
  } else {
    base.push("print-ready", "CMYK-friendly colors");
  }

  return base.join(", ");
}