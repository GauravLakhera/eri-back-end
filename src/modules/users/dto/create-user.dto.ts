import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: ['CLIENT_ADMIN', 'PREPARER', 'REVIEWER', 'CLIENT_USER'] })
  @IsEnum(['CLIENT_ADMIN', 'PREPARER', 'REVIEWER', 'CLIENT_USER'])
  @IsNotEmpty()
  role: string;
}