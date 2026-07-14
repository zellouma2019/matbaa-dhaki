import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

/// تنزيل الملف المرفوع للطلب
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
      return NextResponse.json({ error: "لا يوجد ملف لهذا الطلب" }, { status: 404 });
    }

    const ext = (order.fileData.split(".").pop() || "").toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
    };
    const mimeType = mimeTypes[ext] || "application/octet-stream";
    const safeName = encodeURIComponent(order.fileName || order.fileData);

    // ملف على القرص (يبدأ بـ "file_")
    if (order.fileData.startsWith("file_")) {
      const filePath = path.join(process.cwd(), "uploads", order.fileData);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "الملف غير موجود على الخادم" }, { status: 404 });
      }
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    // data URL (طلبات قديمة)
    const dataUrl = order.fileData;
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse(dataUrl, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
        },
      });
    }
    const urlMime = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": urlMime,
        "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}