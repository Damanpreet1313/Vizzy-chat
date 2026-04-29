"use client";

import { create } from "zustand";
import { Message } from "@/components/chat/MessageBubble";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  activeConversationId: string | null;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveConversationId: (id: string | null) => void;
  resetChat: () => void;
  deleteConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  activeConversationId: null,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  resetChat: () => set({ messages: [], activeConversationId: null, isLoading: false }),
  deleteConversation: async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        set((state) => ({
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
          messages: state.activeConversationId === id ? [] : state.messages,
        }));
      }
    } catch (error) {
      console.error("Failed to delete conversation", error);
    }
  },
}));
