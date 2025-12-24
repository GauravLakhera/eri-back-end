import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxpayersController } from './taxpayers.controller';
import { TaxpayersService } from './taxpayers.service';
import { Taxpayer, TaxpayerSchema } from './schemas/taxpayer.schema';
import { CryptoModule } from '../crypto/crypto.module';
import { EriModule } from '../eri/eri.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Taxpayer.name, schema: TaxpayerSchema }]),
    CryptoModule,
    EriModule,
    AuditModule,
  ],
  controllers: [TaxpayersController],
  providers: [TaxpayersService],
  exports: [TaxpayersService],
})
export class TaxpayersModule {}