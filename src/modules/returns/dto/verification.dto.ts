import { IsString, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerificationModeDto {
  @ApiProperty({ enum: ['LATER', 'ITRV', 'AADHAAR_OTP', 'BANK_EVC', 'DEMAT_EVC'] })
  @IsEnum(['LATER', 'ITRV', 'AADHAAR_OTP', 'BANK_EVC', 'DEMAT_EVC'])
  @IsNotEmpty()
  mode: string;
}

export class GenerateEvcDto {
  @ApiProperty({ example: 'AADHAAR_OTP' })
  @IsString()
  @IsNotEmpty()
  evcMode: string;
}

export class VerifyEvcDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}