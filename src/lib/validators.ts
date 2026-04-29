import { z } from "zod";

export const chatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  conversationId: z.string().optional(),
});

export const imageGenerateSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export const imageRefineSchema = z.object({
  imageUrl: z.string().url(),
  task: z.enum(["upscale", "inpaint"]),
  mask: z.string().optional(), // For inpainting
});
