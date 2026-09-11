import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { User } from "./user.decorator.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { UserService } from "./user.service.js";

@Controller("api/user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @UseGuards(AuthGuard)
  getProfile(@User() user: { id: string }) {
    return this.userService.getUserProfile(user.id);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  updateProfile(
    @User() user: { id: string },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUserProfile(user.id, updateUserDto);
  }
}