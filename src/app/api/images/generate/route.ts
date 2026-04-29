export const maxDuration = 60; // HuggingFace cold starts can take 20-40s

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { hfImageGeneration } from "@/lib/clients/huggingface";
import { uploadToR2 } from "@/lib/clients/r2";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // 1. Create a pending record in DB
    const imageJobRecord = await prisma.imageJob.create({
      data: {
        userId,
        prompt,
        status: "pending",
      },
    });

    try {
      // 2. Generate image (HuggingFace or Pollinations fallback)
      const imageBlob = await hfImageGeneration(prompt);

      // 3. Convert Blob → Buffer
      const arrayBuffer = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 4. Upload to R2 (or local public/uploads fallback)
      const fileName = `generated/${userId}/${uuidv4()}.png`;
      const imageUrl = await uploadToR2(buffer, fileName, "image/png");

      // 5. Mark job as completed
      const completedJob = await prisma.imageJob.update({
        where: { id: imageJobRecord.id },
        data: { status: "completed", imageUrl },
      });

      return NextResponse.json({ dbJobId: completedJob.id });
    } catch (genError: any) {
      // Mark failed in DB and surface the error
      await prisma.imageJob.update({
        where: { id: imageJobRecord.id },
        data: {
          status: "failed",
          error: genError.message || "Generation failed",
        },
      });
      console.error("[IMAGE_GENERATE_ERROR]", genError);
      return new NextResponse(genError.message || "Generation failed", { status: 500 });
    }
  } catch (error) {
    console.error("[IMAGE_GENERATE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
