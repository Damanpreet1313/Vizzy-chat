import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/clients/r2";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);
    const shouldProcess = formData.get("process") === "true";

    let finalBuffer: any = rawBuffer;
    let fileName = `uploads/${userId}/${uuidv4()}-${file.name}`;
    let contentType = file.type;

    if (shouldProcess) {
      // 1. Get original metadata
      const metadata = await sharp(rawBuffer).metadata();
      const width = (metadata.width || 1024) * 2; // Upscale by 2x
      const height = (metadata.height || 1024) * 2;

      // 2. Create a dynamic SVG Watermark
      const svgWatermark = Buffer.from(`
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: rgba(255, 255, 255, 0.4); font-size: ${Math.floor(width * 0.05)}px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title" transform="rotate(-45, ${width / 2}, ${height / 2})">
            VIZZY CHAT PROPRIETARY
          </text>
        </svg>
      `);

      // 3. Process the image (Upscale -> Composite Watermark -> Compress to WebP)
      finalBuffer = await sharp(rawBuffer)
        .resize(width, height, {
          kernel: sharp.kernel.lanczos3, // High-quality upscaling algorithm
          fit: "contain",
        })
        .composite([{ input: svgWatermark, top: 0, left: 0 }])
        .webp({ quality: 85 })
        .toBuffer();

      fileName = `uploads/${userId}/${uuidv4()}-watermarked.webp`;
      contentType = "image/webp";
    }

    const imageUrl = await uploadToR2(finalBuffer as Buffer, fileName, contentType);

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("[UPLOAD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
