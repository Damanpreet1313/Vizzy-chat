import { openRouterChat } from "@/lib/clients/openrouter";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return new Response(JSON.stringify({ error: "DATABASE_URL is not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure User exists in DB (Fallback for local dev if webhooks aren't set)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@clerk.local`, // Fallback email
        name: "User",
      },
    });

    const { messages, conversationId } = await req.json();

    // 1. Get or Create Conversation
    let currentConvId = conversationId;
    if (!currentConvId) {
      const newConv = await prisma.conversation.create({
        data: {
          userId,
          title: messages[0]?.content?.substring(0, 50) || "New Conversation",
        },
      });
      currentConvId = newConv.id;
    }

    // 2. Save User Message
    const lastUserMessage = messages[messages.length - 1];
    await prisma.message.create({
      data: {
        conversationId: currentConvId,
        role: "user",
        content: lastUserMessage.content,
      },
    });

    // 3. Get AI Response from OpenRouter
    const response = await openRouterChat(messages);

    if (!response.ok) {
      throw new Error("OpenRouter API error");
    }

    // 4. Set up streaming and save result on end
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
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullContent += content;
                  }
                } catch (e) {
                  // Skip malformed JSON lines
                }
              }
            }
            
            // Pass through original chunk for streaming display
            controller.enqueue(value);
          }
          
          // Save Assistant Message when stream ends
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
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Conversation-Id": currentConvId,
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
