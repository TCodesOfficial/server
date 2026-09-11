import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateUserProfile(
    userId: string,
    data: { name?: string; location?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        createdAt: true,
      },
    });
  }
}