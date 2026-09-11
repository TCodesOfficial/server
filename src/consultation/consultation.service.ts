import {
  Injectable,
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import axios from "axios";
import FormData from "form-data";
import type { ClinicalExtraction, IntronTranscriptionResponse } from "./dto/consultation-response.dto.js";

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  private readonly intronApiUrl =
    "https://infer.voice.intron.io/file/v1/upload/sync";
  private readonly groqApiUrl =
    "https://api.groq.com/openai/v1/chat/completions";

  private readonly clinicalExtractionPrompt = `You are a clinical documentation assistant. Analyze the following medical consultation transcript and extract structured clinical data.

Return ONLY valid JSON with this exact structure:
{
  "subjective": "Patient's reported symptoms, complaints, and history in their own words or paraphrased",
  "objective": "Observable findings, vital signs, physical exam results mentioned",
  "assessment": "Clinical impression, differential diagnoses, working diagnosis",
  "plan": "Treatment plan, medications prescribed, procedures ordered, follow-up instructions",
  "icd10Codes": ["ICD-10-CM codes relevant to the encounter"],
  "triagePriority": "URGENT" | "NORMAL" | "LOW"
}

Rules:
- subjective: Focus on what the patient reports (symptoms, duration, severity, history)
- objective: Focus on what the clinician observes (examination findings, vitals, tests)
- assessment: Clinical reasoning and diagnosis
- plan: Actionable next steps (medications, referrals, lifestyle advice, follow-up)
- icd10Codes: Use ICD-10-CM codes. Include as many as clinically appropriate.
- triagePriority: URGENT = life-threatening or needs immediate intervention, NORMAL = standard care, LOW = routine/follow-up
- If information is not available for a field, write "Not documented in transcript"
- Do NOT include any text outside the JSON object`;

  constructor(private readonly prisma: PrismaService) {}

  async processAudio(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    userId: string,
    patientIdentifier?: string,
  ) {
    const transcript = await this.transcribeAudio(
      fileBuffer,
      mimeType,
      originalName,
    );

    if (!transcript || transcript.trim().length === 0) {
      throw new UnprocessableEntityException(
        "No speech detected in the audio file",
      );
    }

    const extraction = await this.extractClinicalData(transcript);

    const consultation = await this.prisma.patientConsultation.create({
      data: {
        hospitalId: userId,
        patientIdentifier: patientIdentifier ?? null,
        rawTranscript: transcript,
        subjective: extraction.subjective,
        objective: extraction.objective,
        assessment: extraction.assessment,
        plan: extraction.plan,
        icd10Codes: extraction.icd10Codes,
        Priority: extraction.triagePriority,
      },
    });

    return consultation;
  }

  async getHospitalHistory(userId: string) {
    return this.prisma.patientConsultation.findMany({
      where: { hospitalId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getConsultationById(id: string, userId: string) {
    const consultation = await this.prisma.patientConsultation.findFirst({
      where: { id, hospitalId: userId },
    });

    if (!consultation) {
      throw new NotFoundException("Consultation not found");
    }

    return consultation;
  }

  private async transcribeAudio(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    const intronApiKey = process.env.INTRON_API_KEY;
    if (!intronApiKey) {
      throw new BadRequestException("Intron API key is not configured");
    }

    const form = new FormData();
    form.append("audio_file_name", originalName);
    form.append("audio_file_blob", fileBuffer, {
      filename: originalName,
      contentType: mimeType,
    });
    form.append("use_category", "file_category_telehealth");
    form.append("use_language_asr_input", "en");

    try {
      const response = await axios.post<IntronTranscriptionResponse>(
        this.intronApiUrl,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${intronApiKey}`,
          },
          timeout: 120000,
        },
      );

      if (
        response.data.data.processing_status !== "FILE_TRANSCRIBED"
      ) {
        this.logger.error(
          `Intron transcription failed: ${response.data.data.processing_status}`,
        );
        throw new BadGatewayException("Transcription service error");
      }

      return response.data.data.audio_transcript;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      if (axios.isAxiosError(error)) {
        this.logger.error(`Intron API error: ${error.message}`);
        if (error.code === "ECONNABORTED") {
          throw new BadGatewayException("Transcription service timeout");
        }
        throw new BadGatewayException("Transcription service error");
      }

      throw error;
    }
  }

  private async extractClinicalData(
    transcript: string,
  ): Promise<ClinicalExtraction> {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (
      !groqApiKey ||
      groqApiKey === "your_groq_api_key_here"
    ) {
      throw new BadRequestException(
        "Groq API key is not configured. Please set GROQ_API_KEY in your environment.",
      );
    }

    try {
      const response = await axios.post(
        this.groqApiUrl,
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: this.clinicalExtractionPrompt },
            { role: "user", content: transcript },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        },
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from Groq API");
      }

      const parsed = JSON.parse(content) as ClinicalExtraction;

      this.validateClinicalExtraction(parsed);

      return parsed;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Groq API error: ${error.message}`);
        throw new BadGatewayException("Clinical extraction service error");
      }

      if (error instanceof SyntaxError) {
        this.logger.error(`Failed to parse Groq response: ${error.message}`);
        throw new BadGatewayException(
          "Failed to parse clinical extraction response",
        );
      }

      throw error;
    }
  }

  private validateClinicalExtraction(data: ClinicalExtraction): void {
    const requiredFields = [
      "subjective",
      "objective",
      "assessment",
      "plan",
      "icd10Codes",
      "triagePriority",
    ] as const;

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new BadGatewayException(
          `Clinical extraction missing required field: ${field}`,
        );
      }
    }

    if (!Array.isArray(data.icd10Codes)) {
      throw new BadGatewayException("icd10Codes must be an array");
    }

    if (!["URGENT", "NORMAL", "LOW"].includes(data.triagePriority)) {
      throw new BadGatewayException(
        "triagePriority must be URGENT, NORMAL, or LOW",
      );
    }
  }
}