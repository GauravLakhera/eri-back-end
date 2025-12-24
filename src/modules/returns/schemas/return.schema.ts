import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReturnDocument = Return & Document;

export enum ReturnStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATED = 'VALIDATED',
  SUBMITTING = 'SUBMITTING',
  SUBMITTED = 'SUBMITTED',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Return {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Taxpayer', required: true })
  taxpayerId: Types.ObjectId;

  @Prop({ required: true })
  assessmentYear: string;

  @Prop({ default: 'ITR-2' })
  returnType: string;

  @Prop({ type: String, enum: Object.values(ReturnStatus), default: ReturnStatus.DRAFT })
  status: ReturnStatus;

  @Prop()
  arnNumber: string;

  @Prop()
  acknowledgementNumber: string;

  @Prop()
  filedDate: Date;

  @Prop()
  lastValidatedAt: Date;

  @Prop({ type: Object })
  validationErrors: any;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdById: Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const ReturnSchema = SchemaFactory.createForClass(Return);

// Indexes
ReturnSchema.index({ clientId: 1 });
ReturnSchema.index({ taxpayerId: 1 });
ReturnSchema.index({ status: 1 });
ReturnSchema.index({ assessmentYear: 1 });
ReturnSchema.index({ arnNumber: 1 });