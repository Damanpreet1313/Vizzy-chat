import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/clients/r2";
import { auth } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    // ── File size validation ───────────────────────────────────
    if (file.size > MAX_SIZE) {
      return new NextResponse(
        `File too large. Maximum allowed size is ${MAX_SIZE / 1024 / 1024} MB.`,
        { status: 413 }
      );
    }

    // ── MIME type validation ───────────────────────────────────
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      return new NextResponse(
        `Invalid file type "${file.type}". Allowed types: ${ALLOWED_TYPES.join(", ")}.`,
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);
    const shouldProcess = formData.get("process") === "true";

    // ── Verify it's actually an image (not just a spoofed MIME) ─
    const metadata = await sharp(rawBuffer).metadata().catch(() => null);
    if (!metadata) {
      return new NextResponse("File does not appear to be a valid image.", { status: 400 });
    }

    let finalBuffer: Buffer = rawBuffer;
    let fileName = `uploads/${userId}/${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    let contentType: AllowedType = file.type as AllowedType;

    if (shouldProcess) {
      const width = (metadata.width || 1024) * 2;
      const height = (metadata.height || 1024) * 2;

      const svgWatermark = Buffer.from(`
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: rgba(255,255,255,0.4); font-size: ${Math.floor(width * 0.05)}px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title"
            transform="rotate(-45, ${width / 2}, ${height / 2})">
            VIZZY CHAT PROPRIETARY
          </text>
        </svg>
      `);

      finalBuffer = await sharp(rawBuffer)
        .resize(width, height, { kernel: sharp.kernel.lanczos3, fit: "contain" })
        .composite([{ input: svgWatermark, top: 0, left: 0 }])
        .webp({ quality: 85 })
        .toBuffer();

      fileName = `uploads/${userId}/${uuidv4()}-watermarked.webp`;
      contentType = "image/webp";
    }

    const imageUrl = await uploadToR2(finalBuffer, fileName, contentType);

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("[UPLOAD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
