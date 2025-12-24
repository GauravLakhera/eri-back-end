import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EriTransactionDocument = EriTransaction & Document;

@Schema({ timestamps: true })
export class EriTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  transactionType: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ type: Object })
  requestPayload: any;

  @Prop()
  responseStatus: number;

  @Prop({ type: Object })
  responseBody: any;

  @Prop()
  duration: number;

  @Prop({ default: false })
  isError: boolean;

  @Prop()
  errorMessage: string;

  @Prop()
  referenceId: string;

  @Prop()
  referenceType: string;

  @Prop({ type: Date })
  createdAt: Date;
}

export const EriTransactionSchema = SchemaFactory.createForClass(EriTransaction);

// Indexes
EriTransactionSchema.index({ clientId: 1 });
EriTransactionSchema.index({ transactionType: 1 });
EriTransactionSchema.index({ referenceId: 1 });
EriTransactionSchema.index({ createdAt: -1 });
EriTransactionSchema.index({ isError: 1 });