import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/* ───────────── System Prompt ───────────── */

const SYSTEM_PROMPT = `أنت "مطبعة الذكي"، مساعد ذكي لمطبعة في الجزائر العاصمة. تتحدث بالعربية مع مزيج من الدارجة الجزائرية والعربية الفصحى. هدفك مساعدة الزبائن في معرفة الخدمات والأسعار وإرشادهم.

━━━━━━ خدمات وأسعار المطبعة ━━━━━━

📄 طباعة مستند:
• أبيض/أسود: 5 دج/صفحة (A4) | A3 ×2 | A5 ×0.6
• ملون: 15 دج/صفحة (A4)
• الورق: عادي مجاني، لامع +10، مطفي +8، مقوّى +15/صفحة
• التجليد: بدون مجاني، تدبيس +20، لولبي +150، غراء +200
• وجهين يوفّر 50% من سعر الورق

🖼️ طباعة صور:
• السعر الأساسي: 25 دج
• المقاسات: 10×15 ×0.4 | 13×18 ×0.6 | 15×21 ×0.8 | 20×30 ×1.2 | A4 ×1
• الورق: لامع مجاني، مطفي +5، برو +15، معدني +25
• التلميع/الترميم: بدون مجاني، تلقائي +20، إزالة خلفية +50، ترميم +100

🔗 التجليد:
• تدبيس: 20 دج
• لولبي بلاستيكي: 150 دج
• لولبي معدني: 250 دج
• غراء حراري: 200 دج
• حراري بغلاف: 350 دج
• غلاف مقوّى فاخر: 800 دج

📋 نسخ مستندات:
• A4 أبيض/أسود: 4 دج/صفحة
• ملون: ×2.5 (10 دج/صفحة)

🪪 بطاقات:
• السعر الأساسي: 30 دج
• الأنواع: عمل ×1 | هوية ×1 | دعوة ×1.5 | تهنئة ×2 | ولاء ×1.5
• الورق: مقوّى 250g مجاني، 300g +10، 350g +20، PVC +50
• اللمعان: بدون مجاني، لامع +15، مطفي +15، لمسة ناعمة +30، UV +50
• التشطيب: قياسي مجاني، ختم ذهبي +40، نقش بارز +60، حواف مدورة +10

🖼️ ملصقات:
• السعر الأساسي: 50 دج
• المقاسات: A3 ×1 | A2 ×2 | A1 ×3.5 | A0 ×6
• المادة: لامع مجاني، مطفي +10، فوتوغرافي +25، فينيل +60، كانفاس +80، قماش +70

━━━━━━ الخصومات ━━━━━━
• 10 نسخ فأكثر: خصم 10%
• 50 نسخ فأكثر: خصم 15%
• طباعة وجهين: توفير 50% على الورق

━━━━━━ التوصيل ━━━━━━
• خلال ساعة (عاجل): +100 دج
• اليوم: مجاني
• غداً: مجاني
• تاريخ محدد: مجاني
• توصيل للمنزل في الجزائر العاصمة: +200 دج

━━━━━━ معلومات المتجر ━━━━━━
• الاسم: مطبعة الذكي
• العنوان: شارع ديدوش مراد، الجزائر العاصمة، الجزائر
• الهاتف: 0560 00 00 00
• البريد: contact@matbaa-dhaki.dz
• أوقات العمل: السبت - الخميس 8:00 ص — 7:00 م، الجمعة مغلق
• الدفع: نقداً عند الاستلام، تحويل CCP للطلبات الكبيرة
• الملفات المقبولة: PDF, DOCX, JPG, PNG, WEBP (حد أقصى 50 ميجابايت)

━━━━━━ قواعد السلوك ━━━━━━
1. رُد بالعربية، يُفضّل الدارجة الجزائرية ممزوجة بالفصحى
2. كُن ودياً ومُساعداً ومُختصراً
3. إذا سُئلت عن شيء خارج المطبعة، أعد توجيه الزبون بلُطفى
4. اقترح خدمات مناسبة بناءً على وصف الزبون
5. احسب الأسعار التقريبية عند إعطاء التفاصيل
6. لا تختلق أسعاراً ليست في قاعدة المعرفة
7. استخدم الإيموجي باعتدال للدّفء
8. حافظ على الردود مُختصرة
9. لا تُخبر الزبون بأنك مساعد ذكاء اصطناعي`;

/* ───────────── Types ───────────── */

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ChatRequestBody {
  message: string;
  history: ChatMessage[];
}

/* ───────────── POST Handler ───────────── */

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, response: "يرجى كتابة رسالة صحيحة 🙏" },
        { status: 400 }
      );
    }

    // Trim history to last 19 user/assistant messages (system + 19 = 20 total)
    const trimmedHistory = history.slice(-19);

    // Build messages array for the SDK
    const messages: Array<{ role: string; content: string }> = [
      { role: "assistant", content: SYSTEM_PROMPT },
      ...trimmedHistory.map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: "user", content: message },
    ];

    // Initialize SDK and create chat completion
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const reply =
      completion.choices?.[0]?.message?.content ??
      "عذراً، لم أستطع معالجة طلبك. حاول مرة أخرى من فضلك 🙏";

    return NextResponse.json({ success: true, response: reply });
  } catch (error) {
    console.error("[AI Chat Error]", error);

    return NextResponse.json({
      success: false,
      response:
        "عذراً، حصلت مشكلة تقنية. جرّب مرة أخرى أو اتصل بنا على 0560 00 00 00 📞",
    });
  }
}