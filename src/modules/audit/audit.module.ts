import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { EriTransaction, EriTransactionSchema } from './schemas/eri-transaction.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: EriTransaction.name, schema: EriTransactionSchema }])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}