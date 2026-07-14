"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findAnswer, FAQS, type FAQItem } from "@/lib/smart-assistant";
import { toast } from "sonner";
import type { ShopTheme } from "@/lib/themes";

interface FloatingAssistantProps {
  onRepeatOrder: () => void;
  whatsappNumber?: string;
  shopName?: string;
  theme?: ShopTheme;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  suggestions?: FAQItem[];
}

const DEFAULT_WHATSAPP_NUMBER = "0560000000";
const DEFAULT_SHOP_NAME = "مطبعة الذكي";
const WHATSAPP_MSG = "مرحباً، أريد الاستفسار عن خدمة الطباعة";

// قالب افتراضي في حالة عدم تمرير theme
import { getTheme } from "@/lib/themes";
const defaultTheme = getTheme(1);

export function FloatingAssistant({ onRepeatOrder, whatsappNumber, shopName, theme = defaultTheme }: FloatingAssistantProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `مرحباً بك في ${shopName || DEFAULT_SHOP_NAME}! 👋\nأنا المساعد الذكي. كيف يمكنني مساعدتك؟`,
      suggestions: FAQS.slice(0, 4),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const effectiveWhatsApp = whatsappNumber || DEFAULT_WHATSAPP_NUMBER;

  function openWhatsApp() {
    const digits = effectiveWhatsApp.replace(/\D/g, "");
    const raw = digits.startsWith("0") ? digits.substring(1) : digits;
    const phone = raw.startsWith("213") ? raw : `213${raw}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
    window.open(url, "_blank");
    setMenuOpen(false);
    toast.success("فتح واتساب", { description: "سيتم تحويلك للمحادثة" });
  }

  function openAssistant() {
    setChatOpen(true);
    setMenuOpen(false);
  }

  function askQuestion(q: string) {
    if (!q.trim()) return;
    const userMsg: Message = { role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const result = findAnswer(q);
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.answer,
          suggestions: result.suggestions,
        },
      ]);

      if (result.matched?.id === "t3") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "👉 اضغط الزر بالأسفل للانتقال مباشرة إلى تكرار الطلب",
          },
        ]);
      }
    }, 700);
  }

  function handleSuggestion(faq: FAQItem) {
    askQuestion(faq.question);
  }

  function handleRepeatFromChat() {
    setChatOpen(false);
    onRepeatOrder();
  }

  return (
    <>
      {/* ===== الزر العائم ===== */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-2 no-print">
        {/* المنسدل */}
        {menuOpen && !chatOpen && (
          <div className="flex flex-col gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* واتساب */}
            <button
              onClick={openWhatsApp}
              className="flex items-center gap-3 bg-white border border-emerald-200 shadow-lg rounded-full ps-3 pe-5 py-2.5 hover:bg-emerald-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-neutral-900">واتساب</div>
                <div className="text-xs text-muted-foreground">تواصل مباشر</div>
              </div>
            </button>

            {/* المساعد الذكي */}
            <button
              onClick={openAssistant}
              className="flex items-center gap-3 bg-white border shadow-lg rounded-full ps-3 pe-5 py-2.5 hover:opacity-90 transition-colors group"
              style={{ borderColor: theme.accent + "40" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: theme.fab.bg }}
              >
                <Sparkles className="h-5 w-5" style={{ color: theme.fab.icon }} />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-neutral-900">المساعد الذكي</div>
                <div className="text-xs text-muted-foreground">أسئلة شائعة + تكرار طلب</div>
              </div>
            </button>

            {/* الهاتف */}
            <a
              href={`tel:${effectiveWhatsApp}`}
              className="flex items-center gap-3 bg-white border border-neutral-200 shadow-lg rounded-full ps-3 pe-5 py-2.5 hover:bg-neutral-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-neutral-900">اتصال</div>
                <div className="text-xs text-muted-foreground">{effectiveWhatsApp.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}</div>
              </div>
            </a>
          </div>
        )}

        {/* الزر الرئيسي */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl"
          style={{
            backgroundColor: menuOpen ? theme.topBar.bg : theme.fab.bg,
          }}
          aria-label="مساعدة"
        >
          {menuOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Sparkles className="h-6 w-6" style={{ color: theme.fab.icon }} />
          )}
          {!menuOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* ===== نافذة المساعد الذكي ===== */}
      {chatOpen && (
        <div className="fixed bottom-5 left-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 max-w-md no-print animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className="rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ height: "min(75vh, 600px)" }}
          >
            {/* الرأس */}
            <div className="text-white px-4 py-3 flex items-center justify-between" style={{ backgroundColor: theme.topBar.bg }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.fab.bg }}
                >
                  <Sparkles className="h-5 w-5" style={{ color: theme.fab.icon }} />
                </div>
                <div>
                  <div className="font-bold text-sm">المساعد الذكي</div>
                  <div className="text-xs text-neutral-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    متصل الآن
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* الرسائل */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3 bg-white">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-start" : "flex justify-end"}>
                  <div className="max-w-[85%]">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
                      style={
                        msg.role === "user"
                          ? { backgroundColor: theme.topBar.bg, color: "#ffffff", borderBottomRightRadius: "4px" }
                          : { backgroundColor: "#f9fafb", border: `1px solid ${theme.card.border}`, color: "#1f2937", borderBottomLeftRadius: "4px" }
                      }
                    >
                      {msg.text}
                    </div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.suggestions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSuggestion(s)}
                            className="block w-full text-right text-xs bg-white hover:opacity-80 border rounded-lg px-3 py-2 transition-colors"
                            style={{ borderColor: theme.card.border }}
                          >
                            💬 {s.question}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm" style={{ backgroundColor: "#f9fafb", border: `1px solid ${theme.card.border}` }}>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accent, animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accent, animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accent, animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {messages.some((m) => m.text.includes("تكرار الطلب") || m.text.includes("إعادة طلب")) && (
                <div className="flex justify-end">
                  <button
                    onClick={handleRepeatFromChat}
                    className="text-white font-medium text-xs px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
                    style={{ backgroundColor: theme.fab.bg }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    الذهاب لتكرار طلب
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* إدخال */}
            <div className="border-t bg-white p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askQuestion(input);
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب سؤالك..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="text-white shrink-0"
                  style={{ backgroundColor: theme.fab.bg }}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="text-xs text-muted-foreground text-center mt-1.5">
                مساعد ذكي يجيب على الأسئلة الشائعة · للطلبات الخاصة استخدم واتساب
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}