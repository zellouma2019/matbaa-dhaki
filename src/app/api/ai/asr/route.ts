import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();

    if (!audio || typeof audio !== "string") {
      return NextResponse.json(
        { error: "بيانات الصوت مطلوبة (base64)" },
        { status: 400 }
      );
    }

    // التحقق من أن البيانات تبدأ بصيغة base64 صحيحة
    if (audio.length < 100) {
      return NextResponse.json(
        { error: "التسجيل قصير جداً. تحدث بوضوح لمدة ثانيتين على الأقل." },
        { status: 400 }
      );
    }

    // إزالة بادئة data:audio/... إن وُجدت
    const base64Audio = audio.includes(",")
      ? audio.split(",")[1]
      : audio;

    const zai = await ZAI.create();

    const response = await zai.audio.asr.create({
      file_base64: base64Audio,
    });

    const transcription = response.text?.trim() || "";

    if (!transcription) {
      return NextResponse.json({
        success: true,
        text: "",
        message: "لم يتم التعرف على كلام. حاول مرة أخرى.",
      });
    }

    return NextResponse.json({
      success: true,
      text: transcription,
    });
  } catch (error) {
    console.error("[ASR API Error]", error);
    return NextResponse.json(
      { error: "فشل في تحويل الصوت إلى نص. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}