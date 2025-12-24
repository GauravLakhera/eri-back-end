import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DraftReturnDto {
  @ApiProperty({ type: Object })
  @IsObject()
  localData: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}