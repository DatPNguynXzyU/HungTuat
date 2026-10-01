import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import {
   AUTH_PATTERNS,
   AUTH_RESPONSE_MESSAGES,
   ChangePasswordDto,
   CreateAuditLogDto,
   DEFAULT_ROLES,
   IDeviceInfo,
   LoginDto,
   QueryAuditLogDto,
   RegisterDto,
   RmqService,
   SendRegisterOtpDto,
   VerifyChangePasswordOtpDto,
   VerifyRegisterOtpDto,
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

   @MessagePattern({ cmd: AUTH_PATTERNS.CHECK_EMAIL })
   async checkEmail(@Payload() data: { email: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.checkEmail(data.email);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.SEND_REGISTER_OTP })
   async sendRegisterOtp(
      @Payload() data: SendRegisterOtpDto & { deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.authService.sendRegisterOtp(data, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.VERIFY_REGISTER_OTP })
   async verifyRegisterOtp(
      @Payload() data: VerifyRegisterOtpDto & { deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.authService.verifyRegisterOtp(data, data.deviceInfo);
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
         await this.authService.revokeToken(data.token, data.deviceInfo);
         this.rmqService.ack(context);
         return { success: true };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_ALL_USER_TOKENS })
   async revokeAllAccountTokens(
      @Payload() data: { accountId?: string; userId?: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         await this.authService.revokeAllAccountTokens(targetId, data.deviceInfo);
         this.rmqService.ack(context);
         return { success: true, message: AUTH_RESPONSE_MESSAGES.TOKEN_REVOKE_SUCCESS };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.LOGOUT_ALL })
   async logoutAll(
      @Payload() data: { accountId?: string; userId?: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         await this.authService.logoutAll(targetId, data.deviceInfo);
         this.rmqService.ack(context);
         return { success: true, message: AUTH_RESPONSE_MESSAGES.LOGOUT_ALL_SUCCESS };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_SESSIONS })
   async getSessions(
      @Payload() data: { accountId?: string; userId?: string; currentJti?: string },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         const result = await this.authService.getSessions(targetId, data.currentJti);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_SESSION })
   async revokeSession(
      @Payload() data: { accountId?: string; userId?: string; sessionId: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         await this.authService.revokeSession(targetId, data.sessionId, data.deviceInfo);
         this.rmqService.ack(context);
         return { success: true };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_OTHER_SESSIONS })
   async revokeOtherSessions(
      @Payload() data: { accountId?: string; userId?: string; currentJti: string; deviceInfo?: IDeviceInfo },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         const result = await this.authService.revokeOtherSessions(targetId, data.currentJti, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.CHANGE_PASSWORD })
   async changePassword(
      @Payload()
      data: {
         accountId?: string;
         userId?: string;
         changePasswordDto: ChangePasswordDto;
         deviceInfo?: IDeviceInfo;
      },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         const result = await this.authService.changePassword(targetId, data.changePasswordDto, data.deviceInfo);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.VERIFY_CHANGE_PASSWORD_OTP })
   async verifyChangePasswordOtp(
      @Payload()
      data: {
         accountId?: string;
         userId?: string;
         dto: VerifyChangePasswordOtpDto;
         deviceInfo?: IDeviceInfo;
      },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         const result = await this.authService.verifyChangePasswordOtp(targetId, data.dto, data.deviceInfo);
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
   async getAccountAuditLogs(
      @Payload() data: { accountId?: string; userId?: string; page?: number; limit?: number },
      @Ctx() context: RmqContext,
   ) {
      try {
         const targetId = data.accountId || data.userId || '';
         const result = await this.auditLogService.getAccountAuditLogs(targetId, data.page, data.limit);
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
         const result = await this.auditLogService.record(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }
}
