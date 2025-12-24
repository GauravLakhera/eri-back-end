import { Module, Global } from '@nestjs/common';
import { EriService } from './eri.service';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [AuditModule],
  providers: [EriService],
  exports: [EriService],
})
export class EriModule {}