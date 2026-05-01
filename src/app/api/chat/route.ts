import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { chatMessageSchema } from "@/lib/validators";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { openRouterChat } from "@/lib/clients/openrouter";

// Lazy rate limiter — only created when Upstash env vars are present
async function getRatelimit() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    analytics: true,
    prefix: "vizzy:chat",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ── Rate limiting (skipped if Upstash not configured) ─────
    const ratelimit = await getRatelimit();
    if (ratelimit) {
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
    }

    // ── Input validation ───────────────────────────────────────
    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[CHAT] Validation error:", parsed.error.flatten());
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId } = parsed.data;

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
      create: { id: userId, email: `${userId}@clerk.local`, name: "User" },
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

    // ── Stream AI response — Groq primary, Gemini fallback, OpenRouter last resort ──
    const encoder = new TextEncoder();

    // Primary: Groq (OpenAI-compatible, generous free tier)
    if (process.env.GROQ_API_KEY) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: true,
          }),
        });

        if (groqRes.ok) {
          const stream = new ReadableStream({
            async start(controller) {
              const reader = groqRes.body?.getReader();
              if (!reader) return;
              let fullContent = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = new TextDecoder().decode(value);
                  for (const line of chunk.split("\n")) {
                    if (line.startsWith("data: ") && line !== "data: [DONE]") {
                      try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content || "";
                        if (content) fullContent += content;
                      } catch { /* skip */ }
                    }
                  }
                  controller.enqueue(value);
                }
                await prisma.message.create({ data: { conversationId: currentConvId, role: "assistant", content: fullContent } });
              } catch (e) {
                console.error("[CHAT] Groq stream error:", e);
              } finally {
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Conversation-Id": currentConvId },
          });
        }
        console.warn("[CHAT] Groq failed, trying Gemini...");
      } catch (e) {
        console.warn("[CHAT] Groq error, trying Gemini:", e);
      }
    }

    // Fallback: Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const history = messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(lastUserMessage.content);

        const stream = new ReadableStream({
          async start(controller) {
            let fullContent = "";
            try {
              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (!text) continue;
                fullContent += text;
                const ssePayload = JSON.stringify({ choices: [{ delta: { content: text } }] });
                controller.enqueue(encoder.encode(`data: ${ssePayload}\n\n`));
              }
              await prisma.message.create({ data: { conversationId: currentConvId, role: "assistant", content: fullContent } });
            } catch (e) {
              console.error("[CHAT] Gemini stream error:", e);
            } finally {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Conversation-Id": currentConvId },
        });
      } catch (e) {
        console.warn("[CHAT] Gemini failed, trying OpenRouter:", e);
      }
    }

    // Last resort: OpenRouter
    const aiResponse = await openRouterChat(messages);
    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => aiResponse.statusText);
      console.error(`[CHAT] OpenRouter error ${aiResponse.status}:`, errText);
      return new Response(
        JSON.stringify({ error: `AI service error: ${aiResponse.status}`, detail: errText }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body?.getReader();
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
                } catch { /* skip */ }
              }
            }
            controller.enqueue(value);
          }
          await prisma.message.create({ data: { conversationId: currentConvId, role: "assistant", content: fullContent } });
        } catch (e) {
          console.error("[CHAT] OpenRouter stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Conversation-Id": currentConvId },
    });
  } catch (error) {
    console.error("[CHAT] Unhandled error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
