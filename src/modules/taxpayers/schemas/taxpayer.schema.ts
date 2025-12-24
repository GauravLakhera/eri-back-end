import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaxpayerDocument = Taxpayer & Document;

@Schema({ timestamps: true })
export class Taxpayer {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  panHash: string;

  @Prop({ type: Buffer, required: true })
  panEnc: Buffer;

  @Prop({ type: Buffer, required: true })
  dobEnc: Buffer;

  @Prop()
  email: string;

  @Prop()
  mobile: string;

  @Prop({ default: false })
  isLinked: boolean;

  @Prop()
  linkedAt: Date;

  @Prop()
  linkageToken: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdById: Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TaxpayerSchema = SchemaFactory.createForClass(Taxpayer);

// Indexes
TaxpayerSchema.index({ clientId: 1, panHash: 1 }, { unique: true });
TaxpayerSchema.index({ clientId: 1 });
TaxpayerSchema.index({ panHash: 1 });
TaxpayerSchema.index({ isLinked: 1 });