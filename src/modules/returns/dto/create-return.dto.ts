import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReturnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  taxpayerId: string;

  @ApiProperty({ example: '2024-25' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Assessment year must be in YYYY-YY format' })
  assessmentYear: string;

  @ApiProperty({ example: 'ITR-2', required: false })
  @IsString()
  returnType?: string = 'ITR-2';
}