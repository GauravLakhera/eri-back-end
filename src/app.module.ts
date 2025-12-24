import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { UsersModule } from './modules/users/users.module';
import { TaxpayersModule } from './modules/taxpayers/taxpayers.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { PrefillModule } from './modules/prefill/prefill.module';
import { AuditModule } from './modules/audit/audit.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { StorageModule } from './modules/storage/storage.module';
import { EriModule } from './modules/eri/eri.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URL || 'mongodb://localhost:27017/eri_tax_portal'),
    AuthModule,
    ClientsModule,
    UsersModule,
    TaxpayersModule,
    ReturnsModule,
    PrefillModule,
    AuditModule,
    CryptoModule,
    StorageModule,
    EriModule,
  ],
  controllers: [AppController],
})
export class AppModule {}