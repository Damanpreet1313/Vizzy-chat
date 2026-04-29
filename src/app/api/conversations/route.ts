import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    
    if (!process.env.DATABASE_URL) {
      return new NextResponse(JSON.stringify({ error: "DATABASE_URL is not set" }), {
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

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
