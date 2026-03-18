import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, "BLOB_READ_WRITE_TOKEN is required"),
  BROKER_USERNAME: z.string().min(1).default("admin"),
  BROKER_PASSWORD: z.string().min(1).default("admin123"),
  DOCLING_API_URL: z
    .string()
    .url()
    .default("https://your-docling-host.example.com"),
  DOCLING_CONVERT_PATH: z.string().min(1).default("/api/v1/convert/file"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(1).default("dev-cron-secret"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return result.data;
}

export const env = loadEnv();
