import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}