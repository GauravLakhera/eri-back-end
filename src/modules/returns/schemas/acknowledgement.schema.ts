import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AcknowledgementDocument = Acknowledgement & Document;

@Schema({ timestamps: true })
export class Acknowledgement {
  @Prop({ type: Types.ObjectId, ref: 'Return', required: true, unique: true })
  returnId: Types.ObjectId;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true })
  s3Bucket: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ default: 0 })
  downloadCount: number;

  @Prop()
  lastDownloadAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const AcknowledgementSchema = SchemaFactory.createForClass(Acknowledgement);

// Indexes
AcknowledgementSchema.index({ returnId: 1 }, { unique: true });