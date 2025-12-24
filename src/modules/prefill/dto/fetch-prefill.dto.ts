import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FetchPrefillDto {
  @ApiProperty({ example: '2024-25' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/)
  assessmentYear: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}