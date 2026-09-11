import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import type { ApiResponse } from "../dto/response.dto.js";

function isValidationErrorArray(message: unknown): message is string[] {
  return (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every((m) => typeof m === "string")
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        error: false,
        message: "Success",
        data,
      })),
      catchError((err) => {
        if (err instanceof HttpException) {
          const status = err.getStatus();
          const exceptionResponse = err.getResponse();

          let message: string;

          if (typeof exceptionResponse === "string") {
            message = exceptionResponse;
          } else if (
            typeof exceptionResponse === "object" &&
            exceptionResponse !== null &&
            "message" in exceptionResponse
          ) {
            const msg = (exceptionResponse as { message: unknown }).message;
            message = isValidationErrorArray(msg)
              ? msg.join(", ")
              : String(msg);
          } else {
            message = err.message;
          }

          return throwError(() => ({
            statusCode: status,
            error: true,
            message,
            data: null,
          }));
        }

        return throwError(() => ({
          statusCode: 500,
          error: true,
          message: "Internal server error",
          data: null,
        }));
      }),
    );
  }
}