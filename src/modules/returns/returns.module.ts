import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { Return, ReturnSchema } from './schemas/return.schema';
import { ReturnVersion, ReturnVersionSchema } from './schemas/return-version.schema';
import { Verification, VerificationSchema } from './schemas/verification.schema';
import { Acknowledgement, AcknowledgementSchema } from './schemas/acknowledgement.schema';
import { TaxpayersModule } from '../taxpayers/taxpayers.module';
import { EriModule } from '../eri/eri.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Return.name, schema: ReturnSchema },
      { name: ReturnVersion.name, schema: ReturnVersionSchema },
      { name: Verification.name, schema: VerificationSchema },
      { name: Acknowledgement.name, schema: AcknowledgementSchema },
    ]),
    TaxpayersModule,
    EriModule,
    StorageModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}