import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterHospitalDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  location?: string;
}