import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const ANALYSIS_PROMPT = `أنت خبير في تحليل المستندات والصور لتحديد أفضل خدمة طباعة. حلّل المحتوى المرفق وأجب بـ JSON فقط (بدون markdown، بدون نص إضافي، بدون \`\`\`).

يجب أن يتضمن الرد الحقول التالية بالضبط:
- "documentType": نوع المستند/الصورة بالعربية (مثل: سيرة ذاتية، تقرير، فاتورة، بطاقة، ملصق، صورة شخصية، صورة فنية، كتيب، عقد، شهادة، إيصال، استمارة، عرض تقديمي، أخرى)
- "description": وصف مختصر للمحتوى بالعربية (جملة واحدة)
- "qualityAssessment": تقييم الجودة - أحد: "جودة ممتازة" أو "جيدة" أو "متوسطة" أو "منخفضة"
- "qualityReason": سبب تقييم الجودة بالعربية (جملة واحدة)
- "suggestedService": الخدمة الأنسب - أحد: "document" أو "photo" أو "binding" أو "copy" أو "card" أو "poster"
- "suggestedServiceName": اسم الخدمة بالعربية
- "suggestedColor": "bw" أو "color"
- "suggestedPaperSize": "A4" أو "A3" أو "A5"
- "suggestedPaperType": نوع الورق المقترح بالعربية (مثل: عادي، مقوّى، لامع، مصقول)
- "suggestedBinding": نوع التجليد - أحد: "none" أو "spiral" أو "glue" أو "hardcover"
- "confidence": رقم من 0 إلى 100 يمثل ثقتك في التحليل
- "insights": مصفوفة تحتوي 2 إلى 4 نصائح قصيرة بالعربية

مثال على الرد المتوقع:
{"documentType":"سيرة ذاتية","description":"سيرة ذاتية باللغة العربية لموظف في مجال الهندسة","qualityAssessment":"جيدة","qualityReason":"النص واضح والتنسيق منظم لكن بعض الخطوط صغيرة","suggestedService":"document","suggestedServiceName":"طباعة مستند","suggestedColor":"bw","suggestedPaperSize":"A4","suggestedPaperType":"مقوّى","suggestedBinding":"none","confidence":92,"insights":["سيرة ذاتية احترافية — ورق مقوّى يناسبها","أبيض وأسود اقتصادي لأنها نصية بالكامل","صفحة واحدة — لا حاجة لتجليد"]}

أجب بـ JSON فقط.`;

function isImageFile(fileName: string): boolean {
  if (!fileName) return false;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

function buildImageContext(imageDataUrl: string, textPreview?: string): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text: ANALYSIS_PROMPT },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ];

  if (textPreview && textPreview.trim().length > 0) {
    // Insert text preview context before the image
    const truncatedPreview =
      textPreview.length > 4000 ? textPreview.substring(0, 4000) + '\n...(نص مقطوع)' : textPreview;
    content.splice(1, 0, {
      type: 'text',
      text: `النص المستخرج من ملف PDF:\n"""\n${truncatedPreview}\n"""`,
    });
  }

  return content;
}

function parseVLMResponse(text: string) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // ═══ استراتيجية 1: محاولة التحليل المباشر ═══
  try {
    return JSON.parse(cleaned);
  } catch {}

  // ═══ استراتيجية 2: إزالة الأحرف الزائدة قبل وبعد JSON ═══
  // بعض النماذج تُضيف علامات اقتباس أو أحرف إضافية
  const startMatch = cleaned.match(/[\[{]/);
  const endMatch = cleaned.match(/[\]}]/g);
  if (startMatch && endMatch) {
    const jsonStart = cleaned.indexOf(startMatch[0]);
    const lastBracket = cleaned.lastIndexOf(endMatch[endMatch.length - 1]);
    const extracted = cleaned.substring(jsonStart, lastBracket + 1);
    try {
      return JSON.parse(extracted);
    } catch {}
  }

  // ═══ استراتيجية 3: محاولة إصلاح علامات الاقتباس المُقطوعة ═══
  // مثال: }]" → }]
  try {
    const fixed = cleaned.replace(/"}\s*"$/, '}]').replace(/"\s*}$/, '}');
    return JSON.parse(fixed);
  } catch {}

  // ═══ استراتيجية 4: إزالة كل ما ليس JSON صالح ═══
  try {
    // أزل أي نص قبل أول { وبعد آخر }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const inner = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(inner);
    }
  } catch {}

  // كل الاستراتيجيات فشلت
  throw new Error('تعذّر تحليل رد النموذج كـ JSON');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const fileName = (formData.get('fileName') as string) || '';
    const fileType = (formData.get('fileType') as string) || '';
    const pageCount = formData.get('pageCount') ? Number(formData.get('pageCount')) : undefined;
    const textPreview = (formData.get('textPreview') as string) || '';
    const thumbnailDataUrl = (formData.get('thumbnailDataUrl') as string) || '';

    // Determine how to get the image data for VLM
    let imageDataUrl: string | null = null;
    let isImage = false;

    if (file && isImageFile(file.name || fileName)) {
      // It's an image file — convert to base64 data URL
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mime = file.type || `image/${(file.name || fileName).split('.').pop()?.toLowerCase()}`;
      imageDataUrl = `data:${mime};base64,${base64}`;
      isImage = true;
    } else if (thumbnailDataUrl) {
      // It's a PDF — use the thumbnail provided by the client
      imageDataUrl = thumbnailDataUrl;
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        {
          success: false,
          analysis: null,
          error: 'لم يتم توفير صورة أو صورة مصغرة للتحليل',
        },
        { status: 400 }
      );
    }

    // Build the VLM message
    const messageContent = buildImageContext(imageDataUrl, isImage ? undefined : textPreview);

    const zai = await ZAI.create();
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const rawContent = response.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json({
        success: false,
        analysis: null,
        error: 'لم يتم الحصول على رد من نموذج التحليل',
      });
    }

    let analysis;
    try {
      analysis = parseVLMResponse(rawContent);
    } catch (parseError) {
      console.error('[analyze-file] Failed to parse VLM response:', parseError);
      console.error('[analyze-file] Raw response:', rawContent);
      return NextResponse.json({
        success: false,
        analysis: null,
        error: 'فشل في تحليل رد النموذج',
      });
    }

    // Validate essential fields exist
    const requiredFields = [
      'documentType',
      'description',
      'qualityAssessment',
      'qualityReason',
      'suggestedService',
      'suggestedServiceName',
      'suggestedColor',
      'suggestedPaperSize',
      'suggestedPaperType',
      'suggestedBinding',
      'confidence',
      'insights',
    ];

    const missingFields = requiredFields.filter((f) => !(f in analysis));
    if (missingFields.length > 0) {
      console.error('[analyze-file] Missing fields in VLM response:', missingFields);
      // Still return what we have — partial analysis is better than nothing
    }

    // Enforce confidence as number
    if (typeof analysis.confidence !== 'number') {
      analysis.confidence = 50;
    }
    analysis.confidence = Math.min(100, Math.max(0, Math.round(analysis.confidence)));

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('[analyze-file] Error:', error);
    return NextResponse.json(
      {
        success: false,
        analysis: null,
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء التحليل',
      },
      { status: 500 }
    );
  }
}