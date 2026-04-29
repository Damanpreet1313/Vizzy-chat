"use client";

import { useChatStore } from "@/store/useChatStore";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare, Trash2, Loader2, Menu, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "../ThemeToggle";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Conversation {
  id: string;
  title: string;
}

/* ─── Shared sidebar content ─────────────────────────────────── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const {
    activeConversationId,
    setActiveConversationId,
    resetChat,
    setMessages,
    deleteConversation,
  } = useChatStore();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const loadConversation = async (id: string) => {
    setActiveConversationId(id);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    onNavigate?.();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteConversation(id);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setOpenDeleteDialog(null);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gradient tracking-tight">Vizzy Chat</span>
        </div>

        {/* New Chat button */}
        <button
          onClick={() => {
            resetChat();
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            onNavigate?.();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-new-chat text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* ── Conversation list ── */}
      <div className="px-3 mb-2 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2">
          Recent
        </p>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-0.5 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
            </div>
          ) : conversations && conversations.length > 0 ? (
            <AnimatePresence initial={false}>
              {conversations.map((conv: Conversation, i: number) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative flex items-center gap-1 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => loadConversation(conv.id)}
                    className={cn(
                      "flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-all duration-150 text-left",
                      activeConversationId === conv.id
                        ? "bg-primary/15 text-primary font-medium border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/15 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDeleteDialog(conv.id);
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-10 text-muted-foreground/50">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No conversations yet</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Footer ── */}
      <div className="border-t border-border/40 px-4 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>

      {/* ── Delete dialog ── */}
      <Dialog
        open={!!openDeleteDialog}
        onOpenChange={(open) => !open && setOpenDeleteDialog(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogTitle className="text-foreground">Delete Conversation</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setOpenDeleteDialog(null)}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={() => openDeleteDialog && handleDelete(openDeleteDialog)}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
            >
              {deletingId ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Desktop sidebar ────────────────────────────────────────── */
function DesktopSidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col w-[280px] shrink-0 h-full border-r border-border"
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      <SidebarContent />
    </aside>
  );
}

/* ─── Mobile sidebar (Sheet) ─────────────────────────────────── */
function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[280px] border-r border-border"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

/* ─── Exported composite ─────────────────────────────────────── */
export const Sidebar = () => <DesktopSidebar />;
export const MobileSidebarTrigger = () => <MobileSidebar />;
