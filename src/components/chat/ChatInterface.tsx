"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/useChatStore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Send, Paperclip, Loader2, Sparkles, Code2, ImageIcon, Upload, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DropzoneUpload } from "../images/DropzoneUpload";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import dynamic from "next/dynamic";

const VoiceRecorder = dynamic(
  () => import("../voice/VoiceRecorder").then((m) => m.VoiceRecorder),
  { ssr: false }
);

/* ─── Quick-action chips ─────────────────────────────────────── */
const QUICK_ACTIONS = [
  { icon: Code2,     label: "Write Code",     action: "Create a React component for me" },
  { icon: ImageIcon, label: "Generate Image", action: "/generate a beautiful sunset over mountains" },
  { icon: Sparkles,  label: "Brainstorm",     action: "Help me brainstorm ideas for " },
];

export const ChatInterface = () => {
  const {
    messages,
    isLoading,
    addMessage,
    setIsLoading,
    activeConversationId,
    setActiveConversationId,
  } = useChatStore();
  const { generateImage, isGenerating } = useImageGeneration();

  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isGenerating) return;

    if (input.startsWith("/generate ")) {
      const prompt = input.replace("/generate ", "").trim();
      setInput("");
      generateImage(prompt);
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input,
      createdAt: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: activeConversationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

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
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                assistantContent += content;
                const cur = useChatStore.getState().messages;
                useChatStore.getState().setMessages(
                  cur.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                  )
                );
              }
            } catch {
              /* skip malformed lines */
            }
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
    <div className="flex flex-col h-full w-full bg-background">
      {/* ── Desktop header ── */}
      <div
        className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0 bg-[hsl(var(--sidebar-background))]"
      >
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm text-foreground">Vizzy Chat</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20">
            GPT-4o
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-5">

          {/* Welcome state */}
          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl md:text-5xl font-bold text-gradient">Vizzy Chat</h2>
                <p className="text-muted-foreground text-base max-w-sm mx-auto">
                  Powerful AI at your fingertips. Chat, create, analyze.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={() => setInput(action)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/50 hover:scale-[1.03] transition-all duration-200"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <MessageBubble message={message} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing / generating indicator */}
          {busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {isGenerating ? (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground px-1">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Generating image… this may take up to 30s on first run</span>
                </div>
              ) : (
                <TypingIndicator />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div
        className="border-t border-border/50 px-4 py-4 md:px-6 md:py-5 shrink-0 bg-[hsl(var(--sidebar-background))]"
      >
        <div className="max-w-3xl mx-auto w-full space-y-3">

          {/* Upload error */}
          <AnimatePresence>
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between bg-destructive/10 border border-destructive/40 rounded-xl px-4 py-2.5"
              >
                <p className="text-sm text-destructive">{uploadError}</p>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-destructive/70 hover:text-destructive ml-3 text-lg leading-none"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div
            className="flex items-end gap-2 rounded-full border border-border bg-card px-4 py-2.5 input-glow transition-all duration-200"
          >
            {/* Attach — dropdown menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 shrink-0"
                title="Attach"
              >
                <Paperclip className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={10}
                className="w-52 bg-card border border-border/60 shadow-xl rounded-xl p-1.5"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-2 pb-1 pt-0.5">
                  Attach
                </p>

                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/50 focus:bg-accent/50"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium leading-none">Upload Image</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, WEBP · 25 MB</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/40" />

                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/50 focus:bg-accent/50"
                  onClick={() => setInput("/generate ")}
                >
                  <div className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                    <Wand2 className="w-3.5 h-3.5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium leading-none">Generate Image</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">AI image from prompt</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Upload dialog (opened from dropdown) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-md bg-card border-border">
                <DialogTitle className="text-foreground">Upload Image</DialogTitle>
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
                      setInput((prev) => prev + `\n![Uploaded Image](${data.url})`);
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

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={busy ? "Generating…" : "Message Vizzy…"}
              rows={1}
              disabled={busy}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 py-1 max-h-40 leading-relaxed"
            />

            {/* Voice recorder */}
            <div className="shrink-0">
              <VoiceRecorder
                onTranscription={(text) =>
                  setInput((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || busy}
              className="shrink-0 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-150"
              title="Send"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Hint */}
          <p className="text-[11px] text-center text-muted-foreground/50">
            <span className="text-primary/70 font-medium">/generate</span> for images
            {" · "}
            <span className="text-primary/70 font-medium">Shift+Enter</span> for new line
          </p>
        </div>
      </div>
    </div>
  );
};
