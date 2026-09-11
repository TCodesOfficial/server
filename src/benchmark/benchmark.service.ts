import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import FormData from "form-data";
import { wordErrorRate } from "word-error-rate";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ProviderResult {
  transcript: string;
  latencyMs: number;
  wer: number;
}

export interface BenchmarkResult {
  sahara: ProviderResult;
  groqWhisper: ProviderResult;
  deepgram: ProviderResult;
}

@Injectable()
export class BenchmarkService {
  private readonly logger = new Logger(BenchmarkService.name);

  private readonly saharaUrl =
    "https://infer.voice.intron.io/file/v1/upload/sync";
  private readonly groqWhisperUrl =
    "https://api.groq.com/openai/v1/audio/transcriptions";
  private readonly deepgramUrl = "https://api.deepgram.com/v1/listen";

  async runBenchmark(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    referenceText?: string,
  ): Promise<BenchmarkResult> {
    const [sahara, groqWhisper, deepgram] = await Promise.allSettled([
      this.transcribeSahara(fileBuffer, mimeType, originalName),
      this.transcribeGroqWhisper(fileBuffer, mimeType, originalName),
      this.transcribeDeepgram(fileBuffer, mimeType),
    ]);

    return {
      sahara: this.buildResult(sahara, referenceText),
      groqWhisper: this.buildResult(groqWhisper, referenceText),
      deepgram: this.buildResult(deepgram, referenceText),
    };
  }

  private buildResult(
    settled: PromiseSettledResult<ProviderResult>,
    referenceText?: string,
  ): ProviderResult {
    if (settled.status === "fulfilled") {
      const result = settled.value;
      return {
        ...result,
        wer:
          referenceText && referenceText.trim().length > 0
            ? this.calculateWER(referenceText, result.transcript)
            : -1,
      };
    }

    const error = settled.reason;
    const message =
      error instanceof Error ? error.message : "Unknown error";

    this.logger.error(`Provider failed: ${message}`);
    return {
      transcript: `Error: ${message}`,
      latencyMs: 0,
      wer: -1,
    };
  }

  private calculateWER(reference: string, hypothesis: string): number {
    try {
      if (!reference.trim() || !hypothesis.trim()) return -1;
      return wordErrorRate(reference, hypothesis);
    } catch {
      return -1;
    }
  }

  private async transcribeSahara(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<ProviderResult> {
    const apiKey = process.env.INTRON_API_KEY;
    if (!apiKey) throw new Error("INTRON_API_KEY not configured");

    const form = new FormData();
    form.append("audio_file_name", originalName);
    form.append("audio_file_blob", fileBuffer, {
      filename: originalName,
      contentType: mimeType,
    });
    form.append("use_category", "file_category_telehealth");
    form.append("use_language_asr_input", "en");

    const start = performance.now();

    const response = await axios.post<{
      data: { audio_transcript: string; processing_status: string };
    }>(this.saharaUrl, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 120000,
    });

    const latencyMs = Math.round(performance.now() - start);

    if (response.data.data.processing_status !== "FILE_TRANSCRIBED") {
      throw new Error(
        `Sahara transcription failed: ${response.data.data.processing_status}`,
      );
    }

    return {
      transcript: response.data.data.audio_transcript,
      latencyMs,
      wer: -1,
    };
  }

  private async transcribeGroqWhisper(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<ProviderResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      throw new Error("GROQ_API_KEY not configured");
    }

    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: originalName,
      contentType: mimeType,
    });
    form.append("model", "whisper-large-v3");

    const start = performance.now();

    const response = await axios.post<{ text: string }>(
      this.groqWhisperUrl,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 120000,
      },
    );

    const latencyMs = Math.round(performance.now() - start);

    return {
      transcript: response.data.text,
      latencyMs,
      wer: -1,
    };
  }

  private async transcribeDeepgram(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ProviderResult> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

    const start = performance.now();

    const response = await axios.post<{
      results: {
        channels: Array<{
          alternatives: Array<{ transcript: string }>;
        }>;
      };
    }>(
      `${this.deepgramUrl}?model=nova-3&smart_format=true`,
      fileBuffer,
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": mimeType,
        },
        timeout: 120000,
      },
    );

    const latencyMs = Math.round(performance.now() - start);

    const transcript =
      response.data.results?.channels?.[0]?.alternatives?.[0]?.transcript ??
      "";

    return {
      transcript,
      latencyMs,
      wer: -1,
    };
  }
}