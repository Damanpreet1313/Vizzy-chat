import { NextRequest, NextResponse } from "next/server";
import { groqSTT } from "@/lib/clients/groq";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    const text = await groqSTT(file);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[STT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
