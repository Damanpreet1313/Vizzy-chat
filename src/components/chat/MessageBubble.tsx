"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Download, Copy, Check, Wand2, RotateCcw } from "lucide-react";
import { ImageOperationsModal } from "@/components/images/ImageOperationsModal";
import { useChatStore } from "@/store/useChatStore";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { type: string; url: string }[];
  createdAt?: Date;
}

function getTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

/* ─── Copy button ────────────────────────────────────────────── */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="copy-code flex items-center gap-1.5 border-none bg-transparent font-sans text-[11.5px] transition-colors cursor-pointer"
      style={{ color: "var(--text3)", fontFamily: "inherit" }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
    >
      {copied ? <Check className="w-[11px] h-[11px]" style={{ color: "var(--green)" }} /> : (
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ─── Inline image ───────────────────────────────────────────── */
function InlineImage({ src, alt }: { src?: string; alt?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { messages, setMessages } = useChatStore();
  if (!src) return null;

  return (
    <>
      <span className="group relative my-2.5 block max-w-[360px] overflow-hidden rounded-[14px] border"
        style={{ background: "var(--surface)", borderColor: "rgba(255,255,255,0.07)" }}>
        <img src={src} alt={alt} className="block h-auto w-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:scale-105"
            style={{ background: "rgba(59,130,246,0.9)" }}>
            <Wand2 className="w-3 h-3" /> Edit
          </button>
          <button onClick={async () => {
            try {
              const res = await fetch(src); const blob = await res.blob();
              const url = URL.createObjectURL(blob); const a = document.createElement("a");
              a.href = url; a.download = `vizzy-${Date.now()}.png`;
              document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            } catch { /* ignore */ }
          }} className="rounded-lg p-1.5 text-white transition-all hover:scale-105" style={{ background: "rgba(0,0,0,0.5)" }}>
            <Download className="w-3.5 h-3.5" />
          </button>
        </span>
      </span>
      <ImageOperationsModal open={modalOpen} onOpenChange={setModalOpen} imageUrl={src}
        onResult={newUrl => setMessages(messages.map(m => m.content.includes(src) ? { ...m, content: m.content + `\n\n![Edited](${newUrl})` } : m))} />
    </>
  );
}

/* ─── MessageBubble ──────────────────────────────────────────── */
export const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  return (
    <div className="animate-msg-in flex gap-3.5 py-2.5 md:gap-[14px]">
      {/* Avatar */}
      <div className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[14px]",
        isUser ? "border text-[12px] font-bold" : ""
      )}
        style={isUser
          ? { background: "var(--surface3)", borderColor: "rgba(255,255,255,0.12)", color: "#93c5fd" }
          : { background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 14px rgba(59,130,246,0.3)" }
        }>
        {isUser ? "D" : "✦"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-[5px] flex items-baseline gap-2">
          <span className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>
            {isUser ? "You" : "Vizzy"}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text3)" }}>{getTime()}</span>
        </div>

        {/* Text */}
        <div className="text-[14.5px] font-light leading-[1.75]" style={{ color: "rgba(245,245,245,0.85)" }}>
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");
                if (!inline && match) {
                  return (
                    <div className="my-3 overflow-hidden rounded-[12px] border" style={{ background: "var(--surface)", borderColor: "rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.07)" }}>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--accent-color)" }}>{match[1]}</span>
                        <CopyButton code={codeString} />
                      </div>
                      <SyntaxHighlighter {...props} style={vscDarkPlus} language={match[1]} PreTag="div"
                        customStyle={{ margin: 0, padding: "14px", background: "var(--surface)", fontSize: "13px", lineHeight: "1.65" }}>
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return (
                  <code {...props} className={cn("rounded border px-1.5 py-0.5 font-mono text-[13px]", className)}
                    style={{ background: "var(--surface3)", borderColor: "rgba(255,255,255,0.12)", color: "#93c5fd" }}>
                    {children}
                  </code>
                );
              },
              p({ children }) { return <p className="mb-2.5 last:mb-0">{children}</p>; },
              a({ href, children }) {
                return <a href={href} target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-opacity hover:opacity-80"
                  style={{ color: "var(--accent-color)" }}>{children}</a>;
              },
              img({ src, alt }) { return <InlineImage src={typeof src === "string" ? src : undefined} alt={alt} />; },
              ul({ children }) { return <ul className="mb-2.5 list-disc list-inside space-y-1">{children}</ul>; },
              ol({ children }) { return <ol className="mb-2.5 list-decimal list-inside space-y-1">{children}</ol>; },
              blockquote({ children }) {
                return <blockquote className="my-2 border-l-2 pl-3 italic" style={{ borderColor: "var(--accent-color)", color: "var(--text2)" }}>{children}</blockquote>;
              },
              strong({ children }) { return <strong className="font-semibold" style={{ color: "var(--text1)" }}>{children}</strong>; },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Message actions */}
        <div className="mt-1.5 flex gap-0.5 opacity-0 transition-opacity duration-150 [.animate-msg-in:hover_&]:opacity-100">
          <MsgAction onClick={async () => { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <Check className="w-[11px] h-[11px]" style={{ color: "var(--green)" }} /> : (
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
            Copy
          </MsgAction>
          {!isUser && (
            <MsgAction onClick={() => {}}>
              <RotateCcw className="w-[11px] h-[11px]" /> Regenerate
            </MsgAction>
          )}
        </div>
      </div>
    </div>
  );
};

function MsgAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 rounded-md border-none bg-transparent px-2 py-1 font-sans text-[11.5px] transition-all duration-150 cursor-pointer"
      style={{ color: "var(--text3)", fontFamily: "inherit" }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}>
      {children}
    </button>
  );
}
