"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/useChatStore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Loader2, Upload, Wand2, Trash2, Share2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DropzoneUpload } from "../images/DropzoneUpload";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import dynamic from "next/dynamic";

const VoiceRecorder = dynamic(
  () => import("../voice/VoiceRecorder").then((m) => m.VoiceRecorder),
  { ssr: false }
);

const QUICK_CARDS = [
  { icon: "💡", title: "Explain a concept", desc: "Break down any technical or creative topic clearly", action: "Explain how async/await works in JavaScript with examples" },
  { icon: "🎨", title: "Generate an image",  desc: "Create stunning visuals with AI using /generate",   action: "/generate " },
  { icon: "📄", title: "Analyse a file",     desc: "Upload a PDF, doc or image for instant analysis",   action: null },
  { icon: "✍️", title: "Write something",    desc: "Emails, docs, code, creative writing — anything",   action: "Write a professional README for my GitHub project called " },
];

export const ChatInterface = () => {
  const { messages, isLoading, addMessage, setIsLoading, activeConversationId, setActiveConversationId } = useChatStore();
  const { generateImage, isGenerating } = useImageGeneration();

  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isGenerating) return;

    if (input.startsWith("/generate ")) {
      const prompt = input.replace("/generate ", "").trim();
      setInput("");
      generateImage(prompt);
      return;
    }

    const userMessage = { id: Date.now().toString(), role: "user" as const, content: input, createdAt: new Date() };
    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], conversationId: activeConversationId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to send message");
      }

      const newConvId = response.headers.get("X-Conversation-Id");
      if (newConvId && !activeConversationId) setActiveConversationId(newConvId);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantMessageId = (Date.now() + 1).toString();
      addMessage({ id: assistantMessageId, role: "assistant", content: "", createdAt: new Date() });

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                assistantContent += content;
                const cur = useChatStore.getState().messages;
                useChatStore.getState().setMessages(cur.map(m => m.id === assistantMessageId ? { ...m, content: assistantContent } : m));
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isGenerating;

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg)" }}>

      {/* ── Topbar (desktop) ── */}
      <div className="hidden lg:flex h-[54px] shrink-0 items-center gap-3 border-b px-[18px]"
        style={{ background: "rgba(13,13,13,0.85)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)", zIndex: 10 }}>
        <span className="flex-1 truncate text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
          {messages.length === 0 ? "VizzyChat" : "New conversation"}
        </span>
        {/* Model selector */}
        <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] transition-all"
          style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.07)", color: "var(--text2)" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
          <span>gemini-2.0-flash</span>
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" style={{ color: "var(--text3)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
          <Share2 className="w-[15px] h-[15px]" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
        {/* Welcome screen */}
        {messages.length === 0 && !isLoading && (
          <div className="relative flex flex-col items-center justify-center min-h-full px-6 py-10 overflow-hidden">
            {/* Glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/4 h-[300px] w-[600px] -translate-x-1/2"
              style={{ background: "radial-gradient(ellipse,rgba(59,130,246,0.07) 0%,transparent 70%)" }} />

            <motion.div initial={{ opacity: 0, scale: 0.7, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="mb-[22px] flex h-[68px] w-[68px] items-center justify-center rounded-[20px] text-[30px]"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08),0 0 40px rgba(59,130,246,0.25)" }}>
              ✦
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="mb-2.5 text-center text-[34px] leading-tight"
              style={{ fontFamily: "var(--font-instrument), serif", fontStyle: "italic", color: "var(--text1)" }}>
              What can I help with?
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="mb-9 max-w-[420px] text-center text-[14.5px] leading-[1.7] font-light"
              style={{ color: "var(--text2)" }}>
              Chat with AI, generate stunning images, upload files for analysis — all in one place.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="grid w-full max-w-[540px] grid-cols-2 gap-2.5">
              {QUICK_CARDS.map((card) => (
                <button key={card.title}
                  onClick={() => {
                    if (card.action === null) { setIsDialogOpen(true); return; }
                    setInput(card.action);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-[14px] border p-4 text-left transition-all duration-200"
                  style={{ background: "var(--surface)", borderColor: "rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <div className="mb-2 text-[20px]">{card.icon}</div>
                  <div className="mb-[3px] text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{card.title}</div>
                  <div className="text-[12px] leading-[1.4]" style={{ color: "var(--text3)" }}>{card.desc}</div>
                </button>
              ))}
            </motion.div>
          </div>
        )}

        {/* Message list */}
        {messages.length > 0 && (
          <div className="mx-auto max-w-[760px] px-6 py-7 flex flex-col gap-0">
            <div className="mb-[18px] flex items-center gap-2.5 text-[11px]" style={{ color: "var(--text3)" }}>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              Start of conversation
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>

            <AnimatePresence initial={false}>
              {messages.map((message, i) => (
                <motion.div key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: i === messages.length - 1 ? 0 : 0 }}>
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </AnimatePresence>

            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {isGenerating ? (
                  <div className="flex items-center gap-2.5 py-2.5 text-[13px]" style={{ color: "var(--text2)" }}>
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--accent-color)" }} />
                    Generating image… this may take up to 30s on first run
                  </div>
                ) : (
                  <TypingIndicator />
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t px-5 pb-[18px] pt-3.5"
        style={{ background: "rgba(13,13,13,0.9)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-[760px]">

          {/* Pending file previews */}
          <AnimatePresence>
            {pendingFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-2.5 flex flex-wrap gap-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[9px] border flex items-center justify-center text-[22px]"
                    style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)" }}>
                    {f.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    ) : "📄"}
                    <button onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white"
                      style={{ background: "rgba(0,0,0,0.7)" }}>✕</button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload error */}
          <AnimatePresence>
            {uploadError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-2.5 flex items-center justify-between rounded-xl border px-4 py-2.5"
                style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }}>
                <p className="text-sm" style={{ color: "var(--red)" }}>{uploadError}</p>
                <button onClick={() => setUploadError(null)} className="ml-3 text-lg leading-none" style={{ color: "var(--red)" }}>×</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input box */}
          <div className="rounded-[14px] border transition-all duration-200 input-glow"
            style={{ background: "var(--surface)", borderColor: "rgba(255,255,255,0.12)" }}>

            {/* Textarea */}
            <div className="flex items-end gap-2.5 px-3.5 pt-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={busy ? "Generating…" : "Message Vizzy… (try /generate a neon city)"}
                rows={1}
                disabled={busy}
                className="flex-1 resize-none bg-transparent text-[14.5px] font-light leading-[1.6] outline-none"
                style={{ color: "var(--text1)", minHeight: "24px", maxHeight: "180px" }}
              />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 border-t px-3.5 py-2.5 mt-2.5"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}>

              {/* Attach */}
              <ToolbarBtn icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
                label="Attach" onClick={() => setIsDialogOpen(true)} />

              {/* Image gen */}
              <ToolbarBtn icon={<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                label="Image" onClick={() => { setInput("/generate "); textareaRef.current?.focus(); }} />

              {/* Clear */}
              <ToolbarBtn icon={<Trash2 className="w-3.5 h-3.5" />} label="Clear"
                onClick={() => { useChatStore.getState().resetChat(); }} />

              {/* Right side */}
              <div className="ml-auto flex items-center gap-1.5">
                <VoiceRecorder onTranscription={text => setInput(p => p ? `${p} ${text}` : text)} />
                <button onClick={handleSend} disabled={!input.trim() || busy}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all duration-200"
                  style={{ background: "linear-gradient(135deg,var(--accent-color),#8b5cf6)", boxShadow: "0 0 16px rgba(59,130,246,0.3)" }}
                  onMouseEnter={e => { if (!busy && input.trim()) e.currentTarget.style.boxShadow = "0 4px 22px rgba(59,130,246,0.45)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 16px rgba(59,130,246,0.3)"; }}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-center text-[11.5px]" style={{ color: "var(--text3)" }}>
            <kbd className="rounded border px-1.5 py-0.5 text-[10.5px]" style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)", color: "var(--text2)" }}>Enter</kbd>
            {" "}to send ·{" "}
            <kbd className="rounded border px-1.5 py-0.5 text-[10.5px]" style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)", color: "var(--text2)" }}>Shift+Enter</kbd>
            {" "}new line ·{" "}
            <kbd className="rounded border px-1.5 py-0.5 text-[10.5px]" style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)", color: "var(--text2)" }}>/generate</kbd>
            {" "}for images
          </p>
        </div>
      </div>

      {/* Upload dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md border" style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)" }}>
          <DialogTitle style={{ color: "var(--text1)" }}>Upload Image</DialogTitle>
          <DropzoneUpload
            isLoading={isUploading}
            onUpload={async (file, shouldProcess) => {
              setIsUploading(true);
              setUploadError(null);
              const formData = new FormData();
              formData.append("file", file);
              if (shouldProcess) formData.append("process", "true");
              try {
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                if (!res.ok) throw new Error("Upload failed");
                const data = await res.json();
                setInput(p => p + `\n![Uploaded Image](${data.url})`);
                setIsDialogOpen(false);
              } catch {
                setUploadError("Failed to upload image. Please try again.");
              } finally {
                setIsUploading(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" multiple
        accept="image/*,.pdf,.txt,.md,.csv"
        onChange={e => { if (e.target.files) setPendingFiles(p => [...p, ...Array.from(e.target.files!)]); }} />
    </div>
  );
};

/* ─── Toolbar button ─────────────────────────────────────────── */
function ToolbarBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-[5px] text-[12.5px] transition-all duration-150"
      style={{ color: "var(--text3)" }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
