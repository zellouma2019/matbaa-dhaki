import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { text, voice = "tongtong", speed = 1.0 } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "النص مطلوب" },
        { status: 400 }
      );
    }

    // قص النص إلى 1024 حرف كحد أقصى
    const cleanText = text
      .replace(/[🖨️🖼️📚📄🪪📜✨⬛🎨📑🔲💳📌🌀⛓️📕📖🏷️💎🏷️⊕⭕🪵🥇🥈🥉📞💬✉️📍🔔✅❌⚡📅📆🗓️📎💰🔍🌐🔧⚙️📋📌🧾]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1024);

    if (cleanText.length === 0) {
      return NextResponse.json(
        { error: "النص فارغ بعد التنظيف" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const response = await zai.audio.tts.create({
      input: cleanText,
      voice,
      speed: Math.min(2.0, Math.max(0.5, speed)),
      response_format: "wav",
      stream: false,
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[TTS API Error]", error);
    return NextResponse.json(
      { error: "فشل في توليد الصوت. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}