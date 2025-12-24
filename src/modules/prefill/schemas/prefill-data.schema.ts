import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrefillDataDocument = PrefillData & Document;

@Schema({ timestamps: true })
export class PrefillData {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Taxpayer', required: true })
  taxpayerId: Types.ObjectId;

  @Prop({ required: true })
  assessmentYear: string;

  @Prop({ type: String })
  encryptedPayload: string;

  @Prop()
  decryptionKey: string;

  @Prop({ type: Object })
  normalizedData: any;

  @Prop({ default: false })
  isFetched: boolean;

  @Prop({ default: false })
  isDecrypted: boolean;

  @Prop()
  otpToken: string;

  @Prop()
  otpExpiresAt: Date;

  @Prop()
  fetchedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const PrefillDataSchema = SchemaFactory.createForClass(PrefillData);

// Indexes
PrefillDataSchema.index({ clientId: 1 });
PrefillDataSchema.index({ taxpayerId: 1, assessmentYear: 1 }, { unique: true });