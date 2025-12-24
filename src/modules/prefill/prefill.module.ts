import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrefillController } from './prefill.controller';
import { PrefillService } from './prefill.service';
import { PrefillData, PrefillDataSchema } from './schemas/prefill-data.schema';
import { TaxpayersModule } from '../taxpayers/taxpayers.module';
import { EriModule } from '../eri/eri.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PrefillData.name, schema: PrefillDataSchema }]),
    TaxpayersModule,
    EriModule,
  ],
  controllers: [PrefillController],
  providers: [PrefillService],
  exports: [PrefillService],
})
export class PrefillModule {}