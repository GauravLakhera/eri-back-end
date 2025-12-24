import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  address: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  gst: string;

  @Prop()
  pan: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Indexes
ClientSchema.index({ code: 1 });
ClientSchema.index({ isActive: 1 });