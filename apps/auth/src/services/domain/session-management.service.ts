import type { ITokenService } from '@auth/services/infrastructure';
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_STATUS } from '@common';
import type { IDeviceInfo, IUserSessionInfo, IRevokeSessionResult } from '@common';
import { AuditLogService, TOKEN_SERVICE } from '@auth/services/infrastructure';

@Injectable()
export class SessionManagementService {
   constructor(
      @Inject(TOKEN_SERVICE)
      private readonly tokenService: ITokenService,
      private readonly auditLogService: AuditLogService,
   ) {}

   async getSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      return this.tokenService.getActiveSessions(accountId, currentJti);
   }

   async revokeSession(accountId: string, sessionId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.revokeSession(accountId, sessionId);
      await this.auditLogService.record({
         accountId,
         action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { sessionId },
      });
   }

   async revokeOtherSessions(
      accountId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
   ): Promise<IRevokeSessionResult> {
      const result = await this.tokenService.revokeOtherSessions(accountId, currentJti);
      await this.auditLogService.record({
         accountId,
         action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE_OTHERS,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { revokedCount: result.revokedCount },
      });
      return result;
   }

   async revokeAllAccountSessions(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.logoutAll(accountId);
      await this.auditLogService.record({
         accountId,
         action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
      });
   }
}
