import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// حجم كل جزء: 900 كيلوبايت (أقل من 1 ميغا لتجنب حد البوابة)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["pdf", "docx", "jpg", "jpeg", "png", "webp"];

function getChunksDir() {
  return path.join(process.cwd(), "uploads", ".chunks");
}

function getChunkPath(fileId: string, chunkIndex: number) {
  return path.join(getChunksDir(), `${fileId}.${chunkIndex}`);
}

function getMetaPath(fileId: string) {
  return path.join(getChunksDir(), `${fileId}.meta.json`);
}

interface ChunkMeta {
  fileName: string;
  fileSize: number;
  fileExt: string;
  totalChunks: number;
  receivedChunks: number[];
  createdAt: number;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("chunk") as File | null;
    const fileId = formData.get("fileId") as string | null;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(formData.get("totalChunks") as string, 10);
    const fileName = formData.get("fileName") as string | null;
    const fileSize = parseInt(formData.get("fileSize") as string, 10);
    const fileExt = formData.get("fileExt") as string | null;

    if (!file || fileId == null || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || isNaN(fileSize) || !fileExt) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `حجم الملف ${(fileSize / (1024 * 1024)).toFixed(1)} ميغابايت يتجاوز الحد الأقصى (50 ميغابايت)` },
        { status: 413 },
      );
    }

    if (!ACCEPTED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: `صيغة الملف ".${fileExt}" غير مدعومة` },
        { status: 400 },
      );
    }

    // التأكد من وجود مجلد الأجزاء
    const chunksDir = getChunksDir();
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // قراءة أو إنشاء ملف البيانات الوصفية
    const metaPath = getMetaPath(fileId);
    let meta: ChunkMeta;

    if (fs.existsSync(metaPath)) {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } else {
      meta = {
        fileName,
        fileSize,
        fileExt,
        totalChunks,
        receivedChunks: [],
        createdAt: Date.now(),
      };
    }

    // تجاوز الجزء المكرر
    if (meta.receivedChunks.includes(chunkIndex)) {
      return NextResponse.json({
        chunkIndex,
        received: meta.receivedChunks.length,
        total: meta.totalChunks,
        complete: meta.receivedChunks.length >= meta.totalChunks,
        storedFileName: meta.receivedChunks.length >= meta.totalChunks ? `_complete_${fileId}` : undefined,
      });
    }

    // حفظ الجزء
    const chunkData = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(getChunkPath(fileId, chunkIndex), chunkData);

    meta.receivedChunks.push(chunkIndex);
    fs.writeFileSync(metaPath, JSON.stringify(meta));

    // تنظيف الأجزاء القديمة
    cleanOldChunks(chunksDir);

    // هل اكتمل الملف؟
    if (meta.receivedChunks.length >= meta.totalChunks) {
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const randomSuffix = crypto.randomBytes(8).toString("hex");
      const timestamp = Date.now();
      const storedFileName = `file_${timestamp}_${randomSuffix}.${meta.fileExt}`;
      const finalPath = path.join(uploadsDir, storedFileName);

      const writeStream = fs.createWriteStream(finalPath);
      for (let i = 0; i < meta.totalChunks; i++) {
        const cp = getChunkPath(fileId, i);
        if (fs.existsSync(cp)) {
          writeStream.write(fs.readFileSync(cp));
          fs.unlinkSync(cp);
        }
      }
      writeStream.end();

      // حذف ملف البيانات الوصفية
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }

      return NextResponse.json({
        storedFileName,
        originalName: meta.fileName,
        size: meta.fileSize,
        type: meta.fileExt,
        complete: true,
        received: meta.totalChunks,
        total: meta.totalChunks,
      });
    }

    return NextResponse.json({
      chunkIndex,
      received: meta.receivedChunks.length,
      total: meta.totalChunks,
      complete: false,
    });
  } catch (e) {
    console.error("Chunk upload error:", e);
    return NextResponse.json(
      { error: "فشل في حفظ الجزء على الخادم" },
      { status: 500 },
    );
  }
}

function cleanOldChunks(chunksDir: string) {
  try {
    const now = Date.now();
    const files = fs.readdirSync(chunksDir);
    for (const file of files) {
      if (file.endsWith(".meta.json")) {
        const mp = path.join(chunksDir, file);
        try {
          const meta = JSON.parse(fs.readFileSync(mp, "utf-8"));
          if (now - meta.createdAt > 60 * 60 * 1000) {
            const fid = file.replace(".meta.json", "");
            for (let i = 0; i < meta.totalChunks; i++) {
              const cp = path.join(chunksDir, `${fid}.${i}`);
              if (fs.existsSync(cp)) fs.unlinkSync(cp);
            }
            fs.unlinkSync(mp);
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}