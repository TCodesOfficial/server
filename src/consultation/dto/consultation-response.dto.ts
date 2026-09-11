export interface ClinicalExtraction {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes: string[];
  Priority: "URGENT" | "NORMAL" | "LOW";
}

export interface IntronTranscriptionResponse {
  data: {
    file_id: string;
    processing_status: string;
    audio_file_name: string;
    audio_transcript: string;
    processed_audio_duration_in_seconds: number;
  };
  message: string;
  status: string;
}