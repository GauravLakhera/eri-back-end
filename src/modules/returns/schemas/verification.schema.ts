import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VerificationDocument = Verification & Document;

export enum VerificationMode {
  LATER = 'LATER',
  ITRV = 'ITRV',
  AADHAAR_OTP = 'AADHAAR_OTP',
  BANK_EVC = 'BANK_EVC',
  DEMAT_EVC = 'DEMAT_EVC',
}

@Schema({ timestamps: true })
export class Verification {
  @Prop({ type: Types.ObjectId, ref: 'Return', required: true })
  returnId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(VerificationMode), required: true })
  mode: VerificationMode;

  @Prop()
  evcToken: string;

  @Prop()
  evcExpiresAt: Date;

  @Prop({ default: 0 })
  evcAttempts: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);

// Indexes
VerificationSchema.index({ returnId: 1 });
VerificationSchema.index({ isVerified: 1 });