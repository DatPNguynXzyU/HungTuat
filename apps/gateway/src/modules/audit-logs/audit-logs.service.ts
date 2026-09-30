import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   AUTH_PATTERNS,
   IAuditLogListResult,
   ISecurityAuditLog,
   QueryAuditLogDto,
   SERVICES,
   IServiceMessage,
} from '@common';
import { firstValueFrom } from 'rxjs';
import type { JwtPayload } from '@common/utils/jwt.util';

@Injectable()
export class AuditLogsService {
   constructor(@Inject(SERVICES.AUTH_SERVICE) private readonly authClient: ClientProxy) {}

   async getAuditLogs(query: QueryAuditLogDto, user?: JwtPayload): Promise<IAuditLogListResult> {
      const message: IServiceMessage<QueryAuditLogDto> = {
         data: query,
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [], // Will be populated by auth service from cache
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.authClient.send<IAuditLogListResult, IServiceMessage<QueryAuditLogDto>>(
            { cmd: AUTH_PATTERNS.GET_AUDIT_LOGS },
            message,
         ),
      );
   }

   async getAuditLogById(id: string, user?: JwtPayload): Promise<ISecurityAuditLog | null> {
      const message: IServiceMessage<{ id: string }> = {
         data: { id },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.authClient.send<ISecurityAuditLog | null, IServiceMessage<{ id: string }>>(
            { cmd: AUTH_PATTERNS.GET_AUDIT_LOG_BY_ID },
            message,
         ),
      );
   }
}
