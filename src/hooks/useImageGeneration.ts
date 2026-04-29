"use client";

import { useState } from "react";
import { useChatStore } from "@/store/useChatStore";

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addMessage, activeConversationId } = useChatStore();

  const generateImage = async (prompt: string) => {
    setIsGenerating(true);
    setError(null);

    // Optimistic "generating" message
    const placeholderId = `img-placeholder-${Date.now()}`;
    addMessage({
      id: placeholderId,
      role: "assistant",
      content: `⏳ Generating image for: *"${prompt}"*...`,
      createdAt: new Date(),
    });

    try {
      // The generate route now runs synchronously — one request, no polling needed
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to generate image");
      }

      const { dbJobId } = await response.json();

      // Fetch the completed job record to get the image URL
      const statusRes = await fetch(`/api/images/status/${dbJobId}`);
      if (!statusRes.ok) throw new Error("Failed to fetch image status");
      const job = await statusRes.json();

      if (job.status === "completed" && job.imageUrl) {
        // Replace placeholder with the real image
        const { messages, setMessages } = useChatStore.getState();
        setMessages(
          messages.map((msg) =>
            msg.id === placeholderId
              ? {
                  ...msg,
                  content: `![${prompt}](${job.imageUrl})\n\n*"${prompt}"*`,
                }
              : msg
          )
        );
      } else {
        throw new Error(job.error || "Image generation failed");
      }
    } catch (err: any) {
      setError(err.message);
      // Replace placeholder with error
      const { messages, setMessages } = useChatStore.getState();
      setMessages(
        messages.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: `❌ Image generation failed: ${err.message}`,
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateImage, isGenerating, error };
};
