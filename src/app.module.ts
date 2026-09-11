import { AuthModule } from './auth/auth.module.js';
import { AuthService } from './auth/auth.service.js';
import { AuthController } from './auth/auth.controller.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';

@Module({
  imports: [ AuthModule,UserModule],
  controllers: [ AuthController,AppController],
  providers: [ AuthService,AppService],
})
export class AppModule {}
