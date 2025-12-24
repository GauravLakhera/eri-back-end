import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReturnVersionDocument = ReturnVersion & Document;

@Schema({ timestamps: true })
export class ReturnVersion {
  @Prop({ type: Types.ObjectId, ref: 'Return', required: true })
  returnId: Types.ObjectId;

  @Prop({ required: true })
  version: number;

  @Prop({ type: Object, required: true })
  localData: any;

  @Prop({ type: Object })
  itrPayload: any;

  @Prop()
  notes: string;

  @Prop({ type: Date })
  createdAt: Date;
}

export const ReturnVersionSchema = SchemaFactory.createForClass(ReturnVersion);

// Indexes
ReturnVersionSchema.index({ returnId: 1, version: 1 }, { unique: true });
ReturnVersionSchema.index({ returnId: 1 });