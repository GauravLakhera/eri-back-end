import { IsString, IsNotEmpty, IsEmail, IsOptional, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxpayerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ABCDE1234F' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  pan: string;

  @ApiProperty({ example: '1990-01-15' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'DOB must be in YYYY-MM-DD format' })
  dob: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mobile?: string;
}