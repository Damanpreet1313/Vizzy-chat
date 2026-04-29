import { openRouterChat } from "@/lib/clients/openrouter";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { chatMessageSchema } from "@/lib/validators";

// Rate limiter: 20 requests per user per 60 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  analytics: true,
  prefix: "vizzy:chat",
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ── Rate limiting ──────────────────────────────────────────
    const { success, limit, remaining, reset } = await ratelimit.limit(userId);
    if (!success) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }

    if (!process.env.DATABASE_URL) {
      return new Response(JSON.stringify({ error: "DATABASE_URL is not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Input validation ───────────────────────────────────────
    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId } = parsed.data;

    // Ensure at least one user message exists
    const lastUserMessage = messages.at(-1);
    if (!lastUserMessage || lastUserMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from the user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Ensure user exists in DB ───────────────────────────────
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@clerk.local`,
        name: "User",
      },
    });

    // ── Get or create conversation ─────────────────────────────
    let currentConvId = conversationId;
    if (!currentConvId) {
      const newConv = await prisma.conversation.create({
        data: {
          userId,
          title: lastUserMessage.content.substring(0, 50) || "New Conversation",
        },
      });
      currentConvId = newConv.id;
    }

    // ── Save user message ──────────────────────────────────────
    await prisma.message.create({
      data: {
        conversationId: currentConvId,
        role: "user",
        content: lastUserMessage.content,
      },
    });

    // ── Stream AI response ─────────────────────────────────────
    const response = await openRouterChat(messages);
    if (!response.ok) {
      throw new Error("OpenRouter API error");
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return;

        let fullContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices?.[0]?.delta?.content || "";
                  if (content) fullContent += content;
                } catch {
                  // skip malformed SSE lines
                }
              }
            }

            controller.enqueue(value);
          }

          // Save completed assistant message
          await prisma.message.create({
            data: {
              conversationId: currentConvId,
              role: "assistant",
              content: fullContent,
            },
          });
        } catch (e) {
          console.error("Stream reading error", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Conversation-Id": currentConvId,
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
