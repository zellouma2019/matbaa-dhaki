import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

/// توليد صورة مصغّرة من الصفحة الأولى لملف PDF
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await db.printOrder.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }
    if (!order.fileData) {
      return NextResponse.json({ error: "لا يوجد ملف" }, { status: 404 });
    }

    // تحديد مسار الملف الأصلي
    let sourcePath = "";
    if (order.fileData.startsWith("file_")) {
      sourcePath = path.join(process.cwd(), "uploads", order.fileData);
    } else {
      // data URL — لا نولّد مصغّرة
      return NextResponse.json({ error: "غير مدعوم" }, { status: 400 });
    }

    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    // توليد مفتاح ذاكرة مؤقتة بناءً على المسار + التعديل
    const stat = fs.statSync(sourcePath);
    const cacheKey = crypto
      .createHash("md5")
      .update(`${sourcePath}-${stat.mtimeMs}`)
      .digest("hex")
      .substring(0, 12);

    const thumbDir = path.join(process.cwd(), ".thumbnails");
    const thumbPath = path.join(thumbDir, `${cacheKey}.png`);

    // إذا كانت المصغّرة موجودة، أرجعها
    if (fs.existsSync(thumbPath)) {
      const buffer = fs.readFileSync(thumbPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    // تحقق إن كان PDF
    const ext = order.fileData.split(".").pop()?.toLowerCase() || "";
    if (ext !== "pdf") {
      // للملفات الأخرى (صور إلخ) — أرجع الملف الأصلي
      const buffer = fs.readFileSync(sourcePath);
      const mimeTypes: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
      };
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    // توليد المصغّرة باستخدام pdftoppm
    // -png: إخراج PNG
    // -f 1 -l 1: الصفحة الأولى فقط
    // -r 150: دقة 150 DPI (جودة مناسبة مع حجم صغير)
    // -singlefile: ملف واحد فقط
    const tmpOutput = path.join(thumbDir, `tmp_${cacheKey}`);
    try {
      execSync(
        `pdftoppm -png -f 1 -l 1 -r 150 -singlefile "${sourcePath}" "${tmpOutput}"`,
        { timeout: 10000 },
      );

      const generatedPath = `${tmpOutput}.png`;
      if (!fs.existsSync(generatedPath)) {
        return NextResponse.json({ error: "فشل توليد المصغّرة" }, { status: 500 });
      }

      // أعد تسمية إلى الملف النهائي
      fs.renameSync(generatedPath, thumbPath);

      const buffer = fs.readFileSync(thumbPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch (err) {
      console.error("خطأ في توليد المصغّرة:", err);
      return NextResponse.json({ error: "فشل توليد المصغّرة" }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}