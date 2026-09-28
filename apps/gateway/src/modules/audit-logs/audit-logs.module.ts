import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { AuditLogsController } from '@/modules/audit-logs/audit-logs.controller';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.AUTH_SERVICE,
      }),
   ],
   controllers: [AuditLogsController],
   providers: [AuditLogsService],
   exports: [AuditLogsService],
})
export class AuditLogsModule {}
