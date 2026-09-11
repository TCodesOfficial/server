import { Injectable } from "@nestjs/common";
import { auth } from "./auth.js"; // Adjust relative path to your auth.ts

@Injectable()
export class AuthService {
  readonly instance = auth;

  async getSession(headers: Headers) {
    return await this.instance.api.getSession({
      headers,
    });
  }
}