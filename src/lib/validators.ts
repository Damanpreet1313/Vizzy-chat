import { z } from "zod";

export const chatMessageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        // Cap individual message length to prevent prompt-stuffing
        content: z.string().min(1).max(32_000),
      })
    )
    .min(1, "At least one message is required")
    .max(100, "Too many messages in context"),
  conversationId: z.string().cuid().optional(),
});

export const imageGenerateSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(1_000, "Prompt must be 1000 characters or fewer"),
});

export const imageRefineSchema = z.object({
  imageUrl: z.string().url(),
  task: z.enum(["upscale", "inpaint"]),
  mask: z.string().optional(),
});
