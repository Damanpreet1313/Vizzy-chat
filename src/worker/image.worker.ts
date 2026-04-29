import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "../lib/queue";
import { hfImageGeneration } from "../lib/clients/huggingface";
import { uploadToR2 } from "../lib/clients/r2";
import prisma from "../lib/db";
import { v4 as uuidv4 } from "uuid";

console.log("Starting Image Generation Worker...");

if (!process.env.UPSTASH_REDIS_URL) {
  console.warn("WARNING: UPSTASH_REDIS_URL is not set. Worker may fail to connect.");
}

const worker = new Worker(
  "image-generation",
  async (job) => {
    const { prompt, dbJobId, userId } = job.data;
    console.log(`Processing job ${job.id} for DB ID ${dbJobId}`);

    try {
      // 1. Generate Image using Hugging Face
      console.log(`Generating image for prompt: "${prompt}"`);
      const imageBlob = await hfImageGeneration(prompt);
      
      // 2. Convert Blob to Buffer
      const arrayBuffer = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Upload to Cloudflare R2
      const fileName = `generated/${userId}/${uuidv4()}.png`;
      console.log(`Uploading to R2: ${fileName}`);
      const imageUrl = await uploadToR2(buffer, fileName, "image/png");

      // 4. Update Database
      console.log(`Updating DB job ${dbJobId} to completed`);
      await prisma.imageJob.update({
        where: { id: dbJobId },
        data: {
          status: "completed",
          imageUrl: imageUrl,
        },
      });

      console.log(`Job ${job.id} completed successfully`);
      return { imageUrl };
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Update Database with error
      try {
        await prisma.imageJob.update({
          where: { id: dbJobId },
          data: {
            status: "failed",
            error: error.message || "Unknown error occurred",
          },
        });
      } catch (dbError) {
        console.error("Failed to update job status in DB:", dbError);
      }

      throw error;
    }
  },
  { 
    connection,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});
