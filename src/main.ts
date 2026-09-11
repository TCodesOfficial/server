import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    bodyParser: false,
  });
  app.enableCors({
    origin: process.env.CLIENT_URL, // Allow http://localhost:3000
    credentials: true,             // Allow cookies to be sent back and forth
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
