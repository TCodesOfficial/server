import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "../auth/auth.guard.js";
import { BenchmarkService } from "./benchmark.service.js";

const AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/flac",
  "audio/x-flac",
];

@Controller("benchmark")
@UseGuards(AuthGuard)
export class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Post("run")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          AUDIO_MIMES.includes(file.mimetype) ||
          file.mimetype.startsWith("audio/")
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only audio files are accepted"), false);
        }
      },
    }),
  )
  async runBenchmark(
    @UploadedFile() file: Express.Multer.File,
    @Body("referenceText") referenceText?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No audio file provided");
    }

    return this.benchmarkService.runBenchmark(
      file.buffer,
      file.mimetype,
      file.originalname,
      referenceText,
    );
  }
}