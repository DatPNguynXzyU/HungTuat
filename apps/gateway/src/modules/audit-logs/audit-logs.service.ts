import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_PATTERNS, IAuditLogListResult, ISecurityAuditLog, QueryAuditLogDto, SERVICES } from '@common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuditLogsService {
   constructor(@Inject(SERVICES.AUTH_SERVICE) private readonly authClient: ClientProxy) {}

   async getAuditLogs(query: QueryAuditLogDto): Promise<IAuditLogListResult> {
      return firstValueFrom(
         this.authClient.send<IAuditLogListResult, QueryAuditLogDto>({ cmd: AUTH_PATTERNS.GET_AUDIT_LOGS }, query),
      );
   }

   async getAuditLogById(id: string): Promise<ISecurityAuditLog | null> {
      return firstValueFrom(
         this.authClient.send<ISecurityAuditLog | null, { id: string }>(
            { cmd: AUTH_PATTERNS.GET_AUDIT_LOG_BY_ID },
            { id },
         ),
      );
   }
}
