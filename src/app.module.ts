import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { UserModule } from "./user/user.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ConsultationModule } from "./consultation/consultation.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

@Module({
  imports: [PrismaModule, AuthModule, UserModule, ConsultationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}