import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { AuditStatus } from '@auth/prisma-client';
import {
   AUTH_PATTERNS,
   ChangePasswordDto,
   CreateAuditLogDto,
   DEFAULT_ROLES,
   IDeviceInfo,
   LoginDto,
   QueryAuditLogDto,
   RegisterDto,
   RmqService,
   checkRoles,
} from '@common';
import type { IServiceMessage } from '@common';
import { AuthService } from '@auth/auth.service';
import { AuditLogService } from '@auth/services/audit-log.service';

@Controller()
export class AuthController {
   constructor(
      private readonly authService: AuthService,
      private readonly auditLogService: AuditLogService,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_JWKS })
   getJwks(@Ctx() context: RmqContext) {
      try {
         const result = this.authService.getJwks();
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REGISTER })
   async register(@Payload() data: RegisterDto & { deviceInfo?: IDeviceInfo }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.register(data, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.LOGIN })
   async login(@Payload() data: LoginDto & { deviceInfo?: IDeviceInfo }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.login(data, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REFRESH_TOKEN })
   async refreshToken(@Payload() data: { refreshToken: string; deviceInfo?: IDeviceInfo }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.refreshToken(data.refreshToken, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_TOKEN })
   async revokeToken(@Payload() data: { token: string; deviceInfo?: IDeviceInfo }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.revokeToken(data.token, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_ALL_USER_TOKENS })
   async revokeAllUserTokens(
      @Payload() data: { userId: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         await this.authService.revokeAllUserTokens(data.userId, data.deviceInfo);
         this.rmqService.ack(context);
         return { success: true, message: 'All tokens revoked successfully' };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.LOGOUT_ALL })
   async logoutAll(@Payload() data: { userId: string; deviceInfo?: IDeviceInfo }, @Ctx() context: RmqContext) {
      try {
         await this.authService.logoutAll(data.userId, data.deviceInfo);
         this.rmqService.ack(context);
         return { success: true, message: 'All sessions logged out successfully' };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_SESSIONS })
   async getSessions(@Payload() data: { userId: string; currentJti?: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.getSessions(data.userId, data.currentJti);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_SESSION })
   async revokeSession(
      @Payload() data: { userId: string; sessionId: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.authService.revokeSession(data.userId, data.sessionId, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_OTHER_SESSIONS })
   async revokeOtherSessions(
      @Payload() data: { userId: string; currentJti: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.authService.revokeOtherSessions(data.userId, data.currentJti, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.CHANGE_PASSWORD })
   async changePassword(
      @Payload() data: { userId: string; changePasswordDto: ChangePasswordDto; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.authService.changePassword(data.userId, data.changePasswordDto, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.VALIDATE_TOKEN })
   async validateToken(@Payload() data: { token: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.validateToken(data.token);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_ROLE_PERMISSIONS })
   async getRolePermissions(@Payload() data: { roleCode: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.getRolePermissions(data.roleCode);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_AUDIT_LOGS })
   async getAuditLogs(@Payload() message: IServiceMessage<QueryAuditLogDto>, @Ctx() context: RmqContext) {
      try {
         // Authorization check: Only admin can view all audit logs
         checkRoles(message, [DEFAULT_ROLES.ADMIN]);

         const result = await this.auditLogService.getAuditLogs(message.data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_AUDIT_LOG_BY_ID })
   async getAuditLogById(@Payload() message: IServiceMessage<{ id: string }>, @Ctx() context: RmqContext) {
      try {
         // Authorization check: Only admin can view audit log details
         checkRoles(message, [DEFAULT_ROLES.ADMIN]);

         const result = await this.auditLogService.getAuditLogById(message.data.id);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_USER_AUDIT_LOGS })
   async getUserAuditLogs(
      @Payload() data: { userId: string; page?: number; limit?: number },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.auditLogService.getUserAuditLogs(data.userId, data.page, data.limit);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.CREATE_AUDIT_LOG })
   async createAuditLog(@Payload() data: CreateAuditLogDto, @Ctx() context: RmqContext) {
      try {
         const result = await this.auditLogService.record({
            ...data,
            status: data.status === 'FAILURE' ? AuditStatus.FAILURE : AuditStatus.SUCCESS,
         });
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }
}
