import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuditLogsController } from '@/modules/audit-logs/audit-logs.controller';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';

@Module({
   imports: [AuthModule],
   controllers: [AuditLogsController],
   providers: [AuditLogsService],
   exports: [AuditLogsService],
})
export class AuditLogsModule {}
