"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageCircle, X, Send, Sparkles, Phone, Bot, User,
  Volume2, VolumeX, Mic, MicOff, Loader2, Globe, ImagePlus, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FAQS, type FAQItem } from "@/lib/smart-assistant";
import { toast } from "sonner";

interface FloatingAssistantProps {
  onRepeatOrder?: () => void;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  isAI?: boolean;
  suggestions?: FAQItem[];
  searchResults?: SearchResult[];
  generatedImage?: string;
}

interface SearchResult {
  position: number;
  title: string;
  url: string;
  description: string;
  domain: string;
}

const WHATSAPP_NUMBER = "0560000000";
const WHATSAPP_MSG = "مرحباً، أريد الاستفسار عن خدمة الطباعة";

type AssistantMode = "ai" | "fallback";

export function FloatingAssistant({ onRepeatOrder }: FloatingAssistantProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "مرحباً بك في مطبعة الذكي! 🖨️\nأنا مساعدك الذكي. اسألني عن الخدمات، الأسعار، أو أي شيء تحتاجه!\n\n🔍 **بحث أسعار المنافسين** — اكتب: *بحث أسعار [الخدمة]*\n🎨 **تصميم بالذكاء الاصطناعي** — اكتب: *صمم لي [الوصف]*\n🔊 يمكنك الضغط على 🔊 للاستماع للردود أو 🎤 للتحدث بالصوت.",
      isAI: true,
      suggestions: FAQS.slice(0, 4),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("ai");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // حالة TTS
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // حالة ASR
  const [recording, setRecording] = useState(false);
  const [asrLoading, setAsrLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // حالة توليد الصور
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgGenerating, setImgGenerating] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);

  // حالة البحث
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioRef.current?.pause();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  function openWhatsApp() {
    const url = `https://wa.me/213${WHATSAPP_NUMBER.substring(1)}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
    window.open(url, "_blank");
    setMenuOpen(false);
    toast.success("فتح واتساب", { description: "سيتم تحويلك للمحادثة" });
  }

  function openAssistant() {
    setChatOpen(true);
    setMenuOpen(false);
  }

  // ===== TTS =====
  const toggleTTS = useCallback(async (msgIndex: number, text: string) => {
    if (playingMsgIndex === msgIndex) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingMsgIndex(null);
      return;
    }
    audioRef.current?.pause();
    setPlayingMsgIndex(msgIndex);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setPlayingMsgIndex(null);
        toast.error("خطأ في تشغيل الصوت");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingMsgIndex(null); audioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingMsgIndex(null); audioRef.current = null; URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setPlayingMsgIndex(null);
      toast.error("فشل تشغيل الصوت. تحقق من اتصالك.");
    }
  }, [playingMsgIndex]);

  // ===== ASR =====
  const toggleRecording = useCallback(async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) { toast.error("التسجيل قصير جداً"); return; }
        setAsrLoading(true);
        try {
          const reader = new FileReader();
          const base64: string = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const res = await fetch("/api/ai/asr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64 }),
          });
          const data = await res.json();
          if (data.success && data.text) {
            setInput((prev) => (prev ? prev + " " + data.text : data.text));
            toast.success("تم التعرف على الكلام", { description: data.text.slice(0, 80) });
          } else {
            toast.error(data.message || "لم يتم التعرف على الكلام");
          }
        } catch { toast.error("فشل في تحويل الصوت إلى نص"); }
        finally { setAsrLoading(false); }
      };
      mediaRecorder.start();
      setRecording(true);
      toast("جارٍ التسجيل... تحدث الآن", { icon: <Mic className="h-4 w-4 text-rose-500 animate-pulse" />, duration: 2000 });
    } catch { toast.error("لا يمكن الوصول للميكروفون. تأكد من منح الإذن."); }
  }, [recording]);

  // ===== Web Search =====
  const performWebSearch = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      const res = await fetch("/api/ai/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success && data.results?.length > 0) {
        const results: SearchResult[] = data.results;
        const summary = results
          .slice(0, 5)
          .map((r: SearchResult) => `**${r.title}**\n${r.description}\n🔗 [${r.domain}](${r.url})`)
          .join("\n\n");
        const reply = `🔍 **نتائج البحث عن:** "${query}"\n\n${summary}`;
        setMessages((prev) => [...prev, { role: "assistant", text: reply, isAI: true, searchResults: results }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "❌ لم يتم العثور على نتائج بحث. جرّب صياغة مختلفة.", isAI: true },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "❌ فشل في البحث. تحقق من اتصالك بالإنترنت.", isAI: true },
      ]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ===== Image Generation =====
  const generateImage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      toast.error("الوصف قصير جداً (5 أحرف على الأقل)");
      return;
    }
    setImgGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size: "1024x1024" }),
      });
      const data = await res.json();
      if (data.success && data.image) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `🎨 **تم إنشاء التصميم** بناءً على: "${prompt}"\n\nاضغط على الصورة لتنزيلها بجودة عالية.`,
            isAI: true,
            generatedImage: data.image,
          },
        ]);
        setImgPrompt("");
        setShowImageGen(false);
      } else {
        toast.error(data.error || "فشل في إنشاء التصميم");
      }
    } catch {
      toast.error("فشل في إنشاء التصميم. حاول مرة أخرى.");
    } finally {
      setImgGenerating(false);
    }
  }, []);

  // ===== AI Chat =====
  const callAIChat = useCallback(async (userMessage: string, history: Message[]) => {
    try {
      const abort = abortRef.current || new AbortController();
      abortRef.current = abort;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: history.map((m) => ({ role: m.role, text: m.text })),
        }),
        signal: abort.signal,
      });
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      console.error("[AI Chat] Error:", err);
      return null;
    }
  }, []);

  function fallbackAnswer(query: string) {
    const q = query.toLowerCase().trim();
    let bestMatch: FAQItem | null = null;
    let bestScore = 0;
    for (const faq of FAQS) {
      let score = 0;
      for (const kw of faq.keywords) {
        if (q.includes(kw.toLowerCase())) score += kw.length > 3 ? 3 : 2;
      }
      const qWords = faq.question.toLowerCase().split(/\s+/);
      for (const w of qWords) {
        if (w.length > 2 && q.includes(w)) score += 1;
      }
      if (score > bestScore) { bestScore = score; bestMatch = faq; }
    }
    if (bestMatch && bestScore >= 2) {
      const suggestions = FAQS.filter((f) => f.id !== bestMatch!.id && f.category === bestMatch!.category).slice(0, 3);
      return { text: bestMatch.answer, suggestions };
    }
    return { text: "لم أجد إجابة دقيقة. جرّب إعادة صياغة السؤال أو تواصل معنا عبر واتساب 📱", suggestions: FAQS.slice(0, 4) };
  }

  async function askQuestion(q: string) {
    if (!q.trim()) return;

    // كشف أوامر خاصة: بحث أسعار
    const searchMatch = q.match(/بحث\s+(أسعار|أسعار?|سعر)\s+(.+)/i);
    if (searchMatch) {
      const userMsg: Message = { role: "user", text: q };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setTyping(true);
      const query = `أسعار ${searchMatch[2].trim()} طباعة الجزائر 2025`;
      await performWebSearch(query);
      setTyping(false);
      return;
    }

    // كشف أوامر خاصة: تصميم
    const imgMatch = q.match(/(?:صمم|صميم|أنشئ|ارسم)\s+(?:لي\s+)?(.+)/i);
    if (imgMatch) {
      const userMsg: Message = { role: "user", text: q };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setTyping(true);
      const description = imgMatch[1].trim();
      if (description.length >= 5) {
        await generateImage(description);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "❌ الوصف قصير جداً. اكتب تفاصيل أكثر عن التصميم المطلوب.\n\nمثال: *صمم لي بطاقة أعمال احترافية بلون ذهبي*", isAI: true },
        ]);
      }
      setTyping(false);
      return;
    }

    const userMsg: Message = { role: "user", text: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setTyping(true);

    if (mode === "ai") {
      const result = await callAIChat(q, newMessages);
      setTyping(false);
      if (result && result.success) {
        setMessages((prev) => [...prev, { role: "assistant", text: result.response, isAI: true }]);
      } else {
        setMode("fallback");
        const fallback = fallbackAnswer(q);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: fallback.text + "\n\n⚠️ تم التبديل للوضع الاحتياطي", suggestions: fallback.suggestions },
        ]);
      }
    } else {
      await new Promise((r) => setTimeout(r, 500));
      setTyping(false);
      const fallback = fallbackAnswer(q);
      setMessages((prev) => [...prev, { role: "assistant", text: fallback.text, suggestions: fallback.suggestions }]);
    }
  }

  function handleSuggestion(faq: FAQItem) { askQuestion(faq.question); }

  function resetChat() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingMsgIndex(null);
    setMessages([
      {
        role: "assistant",
        text: "مرحباً بك في مطبعة الذكي! 🖨️\nأنا مساعدك الذكي. اسألني عن الخدمات، الأسعار، أو أي شيء تحتاجه!\n\n🔍 **بحث أسعار المنافسين** — اكتب: *بحث أسعار [الخدمة]*\n🎨 **تصميم بالذكاء الاصطناعي** — اكتب: *صمم لي [الوصف]*",
        isAI: true,
        suggestions: FAQS.slice(0, 4),
      },
    ]);
    setMode("ai");
  }

  function downloadImage(base64: string) {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `تصميم-مطبعة-الذكي-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("تم تنزيل التصميم");
  }

  const isDisabled = typing || recording || asrLoading;

  return (
    <>
      {/* ===== الزر العائم ===== */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-2 no-print">
        {menuOpen && !chatOpen && (
          <div className="flex flex-col gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
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

            <button
              onClick={openAssistant}
              className="flex items-center gap-3 bg-white border border-amber-200 shadow-lg rounded-full ps-3 pe-5 py-2.5 hover:bg-amber-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-neutral-900" />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-neutral-900">المساعد الذكي</div>
                <div className="text-xs text-muted-foreground">AI + صوت + بحث + تصميم</div>
              </div>
            </button>

            <a
              href="tel:0560000000"
              className="flex items-center gap-3 bg-white border border-blue-200 shadow-lg rounded-full ps-3 pe-5 py-2.5 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-neutral-900">اتصال</div>
                <div className="text-xs text-muted-foreground">0560 00 00 00</div>
              </div>
            </a>
          </div>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
            menuOpen ? "bg-neutral-900 rotate-90" : "bg-amber-400 hover:scale-110 hover:shadow-2xl"
          }`}
          aria-label="مساعدة"
        >
          {menuOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Sparkles className="h-6 w-6 text-neutral-900" />
          )}
          {!menuOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* ===== نافذة المساعد الذكي ===== */}
      {chatOpen && (
        <div className="fixed bottom-5 left-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 max-w-md no-print animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col" style={{ height: "min(80vh, 640px)" }}>
            {/* الرأس */}
            <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-neutral-900" />
                </div>
                <div>
                  <div className="font-bold text-sm">المساعد الذكي</div>
                  <div className="text-xs text-neutral-300 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${mode === "ai" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {mode === "ai" ? "متصل بالذكاء الاصطناعي" : "الوضع الاحتياطي"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* أزرار الأدوات */}
                <button
                  onClick={() => setShowImageGen(!showImageGen)}
                  className={`w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors ${showImageGen ? "bg-amber-500/30" : ""}`}
                  title="توليد تصميم"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <button
                  onClick={resetChat}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="محادثة جديدة"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* لوحة توليد الصور */}
            {showImageGen && (
              <div className="border-b border-amber-100 bg-amber-50/50 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5" />
                  توليد تصميم بالذكاء الاصطناعي
                </div>
                <Textarea
                  value={imgPrompt}
                  onChange={(e) => setImgPrompt(e.target.value)}
                  placeholder="مثال: بطاقة أعمال احترافية بلون ذهبي وأسود..."
                  className="text-xs min-h-[60px] max-h-[100px] resize-none"
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => generateImage(imgPrompt)}
                    disabled={imgGenerating || imgPrompt.trim().length < 5}
                  >
                    {imgGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                    {imgGenerating ? "جارٍ التصميم..." : "إنشاء التصميم"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setShowImageGen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* الرسائل */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3 bg-amber-50/30">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-start" : "flex justify-end"}>
                  <div className="max-w-[85%]">
                    {/* مؤشر AI + أزرار */}
                    {msg.isAI && msg.role === "assistant" && (
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        <button
                          onClick={() => toggleTTS(i, msg.text)}
                          disabled={playingMsgIndex !== null && playingMsgIndex !== i}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            playingMsgIndex === i ? "bg-amber-500 text-white scale-110 shadow-md" : "hover:bg-amber-100 text-amber-600"
                          } disabled:opacity-40`}
                          title={playingMsgIndex === i ? "إيقاف الصوت" : "استمع للرد"}
                        >
                          {playingMsgIndex === i ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </button>
                        <span className="text-[10px] text-amber-600">✨ بالذكاء الاصطناعي</span>
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed chat-markdown ${
                        msg.role === "user"
                          ? "bg-neutral-900 text-white rounded-bl-sm"
                          : "bg-white border border-amber-100 text-neutral-800 rounded-br-sm shadow-sm"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-600 underline hover:text-amber-800">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* صورة مُولَّدة */}
                    {msg.generatedImage && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-amber-200 shadow-sm">
                        <img
                          src={`data:image/png;base64,${msg.generatedImage}`}
                          alt="تصميم مُولَّد"
                          className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => downloadImage(msg.generatedImage!)}
                        />
                        <button
                          onClick={() => downloadImage(msg.generatedImage!)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          تنزيل التصميم
                        </button>
                      </div>
                    )}

                    {/* نتائج البحث */}
                    {msg.searchResults && msg.searchResults.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.searchResults.slice(0, 5).map((r) => (
                          <a
                            key={r.position}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-right bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-lg px-3 py-2 transition-colors"
                          >
                            <div className="text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                              <Globe className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="truncate">{r.title}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 mr-5">
                              {r.description}
                            </div>
                            <div className="text-[10px] text-amber-600 mt-0.5 mr-5">{r.domain}</div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* اقتراحات */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.suggestions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSuggestion(s)}
                            className="block w-full text-right text-xs bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-lg px-3 py-2 transition-colors"
                          >
                            <span className="text-amber-600">💬</span> {s.question}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* مؤشر الكتابة */}
              {typing && (
                <div className="flex justify-end">
                  <div className="bg-white border border-amber-100 rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* إدخال + ميكروفون */}
            <div className="border-t bg-white p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); askQuestion(input); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب سؤالك أو: بحث أسعار / صمم لي..."
                  className="flex-1"
                  disabled={isDisabled}
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={asrLoading}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    recording
                      ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200"
                      : asrLoading
                        ? "bg-muted text-muted-foreground"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                  } disabled:opacity-40`}
                  title={recording ? "إيقاف التسجيل" : "تحدث بالصوت"}
                >
                  {asrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <Button
                  type="submit"
                  size="icon"
                  className="bg-amber-400 hover:bg-amber-500 text-neutral-900 shrink-0"
                  disabled={!input.trim() || isDisabled}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="text-xs text-muted-foreground text-center mt-1.5 flex items-center justify-center gap-1">
                <Bot className="h-3 w-3" />
                <span>AI + صوت + بحث + تصميم · للطلبات الخاصة استخدم واتساب</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}