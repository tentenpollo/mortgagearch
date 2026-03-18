import type { OcrResult } from "@/lib/types";

/**
 * OCR Service — calls a Docling HTTP host.
 * Falls back to a "no OCR" result if the service is unavailable (cold start, etc.)
 */
export class OcrService {
  private apiUrl: string;
  private convertPath: string;
  private timeoutMs: number;

  constructor(apiUrl?: string, timeoutMs = 120_000) {
    this.apiUrl = apiUrl ?? process.env.DOCLING_API_URL ?? "https://your-docling-host.example.com";
    this.convertPath = process.env.DOCLING_CONVERT_PATH ?? "/api/v1/convert/file";
    this.timeoutMs = timeoutMs;
  }

  /**
   * Process a document via Docling HTTP API.
   * Sends the file as multipart/form-data to the /convert endpoint.
   */
  async process(fileBuffer: Buffer, filename: string, mimeType: string): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
      formData.append("files", blob, filename);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const candidatePaths = [this.convertPath, "/api/v1/convert/file", "/convert", "/v1/convert/file"];
      let response: Response | null = null;
      let lastError: string | null = null;

      for (const path of candidatePaths) {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        const url = `${this.apiUrl}${normalizedPath}`;
        const attempt = await fetch(url, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (attempt.ok) {
          response = attempt;
          break;
        }

        lastError = `${attempt.status} ${attempt.statusText} at ${normalizedPath}`;

        if (attempt.status !== 404) {
          throw new Error(`Docling API returned ${attempt.status}: ${attempt.statusText}`);
        }
      }

      clearTimeout(timeout);

      if (!response) {
        throw new Error(`Docling endpoint not found (${lastError ?? "unknown path error"})`);
      }

      const data = await response.json();
      const processingTimeMs = Date.now() - startTime;

      // Docling returns an array of document results
      const docResult = Array.isArray(data) ? data[0] : data;
      const text = docResult?.text ?? docResult?.md ?? docResult?.document?.text ?? "";

      return {
        text: text || "No text extracted",
        confidence: text ? 0.85 : 0.0,
        pageCount: docResult?.metadata?.num_pages ?? 1,
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown error";

      console.error(`OCR failed for ${filename}: ${message}`);

      // Return degraded result instead of throwing — broker can still review manually
      return {
        text: `[OCR UNAVAILABLE] Processing failed: ${message}. The broker can review the original document directly.`,
        confidence: 0.0,
        pageCount: 0,
        processingTimeMs,
      };
    }
  }
}

export const ocrService = new OcrService();
