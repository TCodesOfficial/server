import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { ResponseInterceptor } from "./util/interceptors/response.interceptor.js";
import express from "express";
import type { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const jsonParser = express.json();
  const urlencodedParser = express.urlencoded({ extended: true });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/auth")) {
      return next();
    }
    jsonParser(req, res, (err: unknown) => {
      if (err) return next(err as Error);
      urlencodedParser(req, res, next);
    });
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();