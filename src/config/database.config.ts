import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (): MongooseModuleOptions => ({
  uri: process.env.MONGO_URL || 'mongodb://localhost:27017/eri_tax_portal',
  // Removed deprecated options - Mongoose 6+ handles these automatically
});