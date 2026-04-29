import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

import fs from "fs/promises";
import path from "path";

export const uploadToR2 = async (file: Buffer | Blob, fileName: string, contentType: string) => {
  const buffer = file instanceof Blob ? Buffer.from(await file.arrayBuffer()) : file;

  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_ENDPOINT) {
    console.log("No R2 keys found. Falling back to Local Storage (public/uploads)...");
    
    // Ensure the relative path works for the public URL
    const relativePath = fileName.startsWith("/") ? fileName : `/${fileName}`;
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    
    // Write file
    await fs.writeFile(absolutePath, buffer);
    
    // Return local URL
    return relativePath;
  }
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
  return `${process.env.R2_PUBLIC_URL}/${fileName}`;
};

export const getPresignedUrl = async (fileName: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileName,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
};

export { r2Client };
