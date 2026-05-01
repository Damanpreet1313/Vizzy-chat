"use client";

import { useChatStore } from "@/store/useChatStore";
import { Loader2, Menu, Plus, Search, Trash2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Conversation { id: string; title: string; }

/* ─── Context menu ───────────────────────────────────────────── */
interface CtxMenuProps {
  x: number; y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}
function CtxMenu({ x, y, onRename, onDelete, onClose }: CtxMenuProps) {
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-[999] min-w-[160px] rounded-lg border p-1 shadow-2xl"
      style={{
        left: Math.min(x, window.innerWidth - 170),
        top: Math.min(y, window.innerHeight - 120),
        background: "var(--surface2)",
        borderColor: "rgba(255,255,255,0.12)",
        animation: "ctxIn 0.12s ease both",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onRename(); onClose(); }}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
        style={{ color: "var(--text2)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface3)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Rename
      </button>
      <div className="my-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
        style={{ color: "var(--red)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete chat
      </button>
    </div>
  );
}

/* ─── Rename modal ───────────────────────────────────────────── */
function RenameModal({ title, onConfirm, onClose }: { title: string; onConfirm: (v: string) => void; onClose: () => void; }) {
  const [val, setVal] = useState(title);
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-[340px] rounded-xl border p-6 shadow-2xl" style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)", animation: "ctxIn 0.2s cubic-bezier(0.34,1.4,0.64,1) both" }}>
        <p className="mb-4 text-[15px] font-bold" style={{ color: "var(--text1)" }}>Rename chat</p>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(val); if (e.key === "Escape") onClose(); }}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
          style={{ background: "var(--surface)", borderColor: "rgba(255,255,255,0.12)", color: "var(--text1)" }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--accent-color)")}
          onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors" style={{ background: "var(--surface3)", color: "var(--text2)" }}>Cancel</button>
          <button onClick={() => onConfirm(val)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-accent">Rename</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────────────── */
function Toast({ msg, onUndo, onDismiss }: { msg: string; onUndo?: () => void; onDismiss: () => void; }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-20 left-1/2 z-[999] flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-2xl"
      style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)", color: "var(--text2)", animation: "fadeUp 0.3s cubic-bezier(0.34,1.4,0.64,1) both" }}>
      <Trash2 className="w-3.5 h-3.5" />
      <span>{msg}</span>
      {onUndo && <button onClick={onUndo} className="ml-1 font-semibold" style={{ color: "var(--accent-color)" }}>Undo</button>}
    </div>
  );
}

/* ─── Sidebar content ────────────────────────────────────────── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { activeConversationId, setActiveConversationId, resetChat, setMessages } = useChatStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string } | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [localTitles, setLocalTitles] = useState<Record<string, string>>({});

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = conversations.filter(c =>
    (localTitles[c.id] ?? c.title).toLowerCase().includes(search.toLowerCase())
  );

  const loadConversation = async (id: string) => {
    setActiveConversationId(id);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    onNavigate?.();
  };

  const handleDelete = useCallback(async (id: string) => {
    const prev = conversations;
    // Optimistic remove from query cache
    queryClient.setQueryData<Conversation[]>(["conversations"], old => (old ?? []).filter(c => c.id !== id));
    if (activeConversationId === id) resetChat();

    setToast({
      msg: "Chat deleted",
      undo: () => {
        queryClient.setQueryData(["conversations"], prev);
        setToast(null);
      },
    });

    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } catch {
      queryClient.setQueryData(["conversations"], prev);
    }
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [conversations, activeConversationId, queryClient, resetChat]);

  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setLocalTitles(t => ({ ...t, [id]: newTitle.trim() }));
    setRenameId(null);
    // Optimistic update
    queryClient.setQueryData<Conversation[]>(["conversations"], old =>
      (old ?? []).map(c => c.id === id ? { ...c, title: newTitle.trim() } : c)
    );
  };

  const renameConv = renameId ? (conversations.find(c => c.id === renameId)) : null;

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="px-3 pb-2 pt-3.5">
          <div className="mb-3 flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[15px] shadow-lg"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 18px rgba(59,130,246,0.3)" }}>
              ✦
            </div>
            <span className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text1)" }}>
              Vizzy<span style={{ color: "var(--accent-color)" }}>Chat</span>
            </span>
          </div>

          {/* New chat */}
          <button
            onClick={() => { resetChat(); queryClient.invalidateQueries({ queryKey: ["conversations"] }); onNavigate?.(); }}
            className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200"
            style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.12)", color: "var(--text2)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-soft)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.color = "var(--accent-color)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--text2)"; }}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            New chat
          </button>

          {/* Search */}
          <div className="mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-2"
            style={{ background: "var(--surface2)", borderColor: "rgba(255,255,255,0.07)" }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text3)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: "var(--text2)" }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent-color)" }} />
            </div>
          ) : filtered.length > 0 ? (
            <>
              <p className="px-2 pb-1 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text3)" }}>
                Today
              </p>
              <AnimatePresence initial={false}>
                {filtered.map((conv, i) => {
                  const title = localTitles[conv.id] ?? conv.title;
                  const isActive = activeConversationId === conv.id;
                  return (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.02 }}
                      className="group relative mb-[1px] flex items-center rounded-lg"
                      onContextMenu={e => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, id: conv.id }); }}
                    >
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="flex flex-1 min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] transition-all duration-150"
                        style={{
                          background: isActive ? "var(--accent-soft)" : "transparent",
                          border: isActive ? "1px solid rgba(59,130,246,0.15)" : "1px solid transparent",
                          color: isActive ? "#93c5fd" : "var(--text2)",
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--sidebar-hover)"; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[13px]"
                          style={{ background: isActive ? "rgba(59,130,246,0.2)" : "var(--surface2)" }}>
                          💬
                        </div>
                        <span className="truncate flex-1">{title}</span>
                      </button>

                      {/* Hover actions */}
                      <div className="absolute right-1.5 hidden items-center gap-0.5 rounded-md p-0.5 group-hover:flex"
                        style={{ background: isActive ? "rgba(59,130,246,0.15)" : "var(--sidebar-hover)" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setRenameId(conv.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors"
                          style={{ color: "var(--text3)" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.color = "var(--text2)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}
                          title="Rename"
                        >
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(conv.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors"
                          style={{ color: "var(--text3)" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "var(--red)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}
                          title="Delete"
                        >
                          <Trash2 className="w-[11px] h-[11px]" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          ) : (
            <div className="py-10 text-center text-[13px]" style={{ color: "var(--text3)" }}>
              {search ? "No chats found" : "No conversations yet"}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors cursor-pointer"
            onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <UserButton />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text1)" }}>Account</div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text3)" }}>
                <span className="inline-block w-[5px] h-[5px] rounded-full" style={{ background: "var(--green)" }} />
                Free plan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctx && (
        <CtxMenu
          x={ctx.x} y={ctx.y}
          onRename={() => setRenameId(ctx.id)}
          onDelete={() => handleDelete(ctx.id)}
          onClose={() => setCtx(null)}
        />
      )}

      {/* Rename modal */}
      {renameConv && (
        <RenameModal
          title={localTitles[renameConv.id] ?? renameConv.title}
          onConfirm={v => handleRename(renameConv.id, v)}
          onClose={() => setRenameId(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          msg={toast.msg}
          onUndo={toast.undo}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

/* ─── Desktop sidebar ────────────────────────────────────────── */
function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex h-full w-[268px] shrink-0 flex-col border-r"
      style={{ background: "var(--sidebar)", borderColor: "rgba(255,255,255,0.07)" }}>
      <SidebarContent />
    </aside>
  );
}

/* ─── Mobile sidebar ─────────────────────────────────────────── */
function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: "var(--text3)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; }}
        aria-label="Open menu">
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 border-r w-[268px]"
        style={{ background: "var(--sidebar)", borderColor: "rgba(255,255,255,0.07)" }}>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export const Sidebar = () => <DesktopSidebar />;
export const MobileSidebarTrigger = () => <MobileSidebar />;
