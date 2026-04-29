"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Download, Copy, Check, Wand2 } from "lucide-react";
import { ImageOperationsModal } from "@/components/images/ImageOperationsModal";
import { useChatStore } from "@/store/useChatStore";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { type: string; url: string }[];
  createdAt?: Date;
}

interface MessageBubbleProps {
  message: Message;
}

/* ─── Copy button ────────────────────────────────────────────── */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-150"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ─── Inline image with operations button ────────────────────── */
function InlineImage({ src, alt }: { src?: string; alt?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { messages, setMessages } = useChatStore();

  if (!src) return null;

  const handleResult = (newUrl: string) => {
    // Append the processed image as a new message line
    setMessages(
      messages.map((m) =>
        m.content.includes(src)
          ? { ...m, content: m.content + `\n\n![Edited](${newUrl})` }
          : m
      )
    );
  };

  return (
    <>
      <span className="relative group block rounded-xl overflow-hidden my-3 border border-border/30 shadow-md max-w-sm">
        <img src={src} alt={alt} className="w-full h-auto object-cover block" />

        {/* Hover action bar */}
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
          {/* Edit / operations */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-white text-xs font-medium transition-all hover:scale-105"
            title="Edit image"
          >
            <Wand2 className="w-3 h-3" />
            Edit
          </button>

          {/* Download */}
          <button
            onClick={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(src);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `vizzy-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error("Download failed", err);
              }
            }}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-105"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </span>
      </span>

      <ImageOperationsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        imageUrl={src}
        onResult={handleResult}
      />
    </>
  );
}

/* ─── MessageBubble ──────────────────────────────────────────── */
export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-3 animate-slideUpIn", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 mt-0.5 shrink-0 ring-2 ring-border">
        {isUser ? (
          <>
            <AvatarImage src="" />
            <AvatarFallback className="text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>U</AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="/bot-avatar.png" />
            <AvatarFallback className="text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>AI</AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Bubble */}
      <div
        style={isUser ? { background: "linear-gradient(135deg,hsl(234 60% 38%),hsl(234 89% 52%))" } : undefined}
        className={cn(
          "max-w-[82%] md:max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-tr-sm text-white"
            : "rounded-tl-sm text-foreground border border-border/60 bg-card"
        )}
      >
        <ReactMarkdown
          components={{
            code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");
              if (!inline && match) {
                return (
                  <div className="relative mt-3 mb-2 rounded-xl overflow-hidden border border-border/40">
                    <div className="flex items-center px-4 py-1.5 bg-muted border-b border-border/40">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 font-mono">{match[1]}</span>
                    </div>
                    <div className="relative">
                      <SyntaxHighlighter {...props} style={vscDarkPlus} language={match[1]} PreTag="div"
                        customStyle={{ margin: 0, padding: "1rem", background: "hsl(var(--muted))", fontSize: "0.8125rem", lineHeight: "1.6" }}>
                        {codeString}
                      </SyntaxHighlighter>
                      <CopyButton code={codeString} />
                    </div>
                  </div>
                );
              }
              return (
                <code {...props} className={cn("rounded px-1.5 py-0.5 font-mono text-xs", isUser ? "bg-white/15 text-white" : "bg-muted text-primary", className)}>
                  {children}
                </code>
              );
            },
            p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
            a({ href, children }) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className={cn("underline underline-offset-2 hover:opacity-80 transition-opacity", isUser ? "text-white/90" : "text-primary")}>
                  {children}
                </a>
              );
            },
            img({ src, alt }) {
              return <InlineImage src={typeof src === "string" ? src : undefined} alt={alt} />;
            },
            ul({ children }) { return <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>; },
            ol({ children }) { return <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>; },
            blockquote({ children }) {
              return <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">{children}</blockquote>;
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};
