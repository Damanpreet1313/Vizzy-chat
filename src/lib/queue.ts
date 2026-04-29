import "dotenv/config";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

if (!process.env.UPSTASH_REDIS_URL) {
  console.warn("Queue: UPSTASH_REDIS_URL is not set in environment.");
}

const connection = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const imageQueue = new Queue("image-generation", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export { connection };
