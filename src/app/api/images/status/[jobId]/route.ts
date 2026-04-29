import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { jobId } = await params;

    if (!jobId) {
      return new NextResponse("Job ID is required", { status: 400 });
    }

    const job = await prisma.imageJob.findUnique({
      where: {
        id: jobId,
        userId: userId,
      },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("[IMAGE_STATUS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
