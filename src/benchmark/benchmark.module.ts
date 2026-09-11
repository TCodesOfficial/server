import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BenchmarkController } from "./benchmark.controller.js";
import { BenchmarkService } from "./benchmark.service.js";

@Module({
  imports: [AuthModule],
  controllers: [BenchmarkController],
  providers: [BenchmarkService],
})
export class BenchmarkModule {}