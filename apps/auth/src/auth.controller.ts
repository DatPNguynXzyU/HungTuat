import { Controller, Get } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, IDeviceInfo, RmqService } from '@common';
import {
   AUTH_PATTERNS,
   ChangePasswordDto,
   CreateAuditLogDto,
   LoginDto,
   QueryAuditLogDto,
   RegisterDto,
   SendRegisterOtpDto,
   VerifyChangePasswordOtpDto,
   VerifyRegisterOtpDto,
} from '@contracts/auth';
import type { IServiceMessage } from '@common';
import {
   CheckEmailCommand,
   GetEmailCommand,
   GetJwksCommand,
   GetRolePermissionsCommand,
   LoginCommand,
   LogoutAllCommand,
   RefreshTokenCommand,
   RegisterCommand,
   RevokeAllAccountTokensCommand,
   RevokeTokenCommand,
   SendRegisterOtpCommand,
   ValidateTokenCommand,
   VerifyRegisterOtpCommand,
   GetSessionsCommand,
   RevokeOtherSessionsCommand,
   RevokeSessionCommand,
   ChangePasswordCommand,
   VerifyChangePasswordOtpCommand,
   CreateAuditLogCommand,
   GetAccountAuditLogsCommand,
   GetAuditLogByIdCommand,
   GetAuditLogsCommand,
} from '@auth/commands';

/**
 * AuthController acts as a transport adapter dispatching commands
 * to the CommandBus abstraction layer, decoupling the transport layer
 * from concrete domain and infrastructure services.
 */
@Controller()
export class AuthController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

   @Get(['', 'health'])
   healthCheck() {
      return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_JWKS })
   async getJwks(@Ctx() context: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetJwksCommand());
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
         const result = await this.commandBus.execute(new CheckEmailCommand(data.email));
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
         const result = await this.commandBus.execute(new SendRegisterOtpCommand(data, data.deviceInfo));
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
         const result = await this.commandBus.execute(new VerifyRegisterOtpCommand(data, data.deviceInfo));
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
         const result = await this.commandBus.execute(new RegisterCommand(data, data.deviceInfo));
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
         const result = await this.commandBus.execute(new LoginCommand(data, data.deviceInfo));
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
         const result = await this.commandBus.execute(new RefreshTokenCommand(data.refreshToken, data.deviceInfo));
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
         const result = await this.commandBus.execute(new RevokeTokenCommand(data.token, data.deviceInfo));
         this.rmqService.ack(context);
         return result;
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
         const result = await this.commandBus.execute(
            new RevokeAllAccountTokensCommand(data.accountId, data.userId, data.deviceInfo),
         );
         this.rmqService.ack(context);
         return result;
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
         const result = await this.commandBus.execute(
            new LogoutAllCommand(data.accountId, data.userId, data.deviceInfo),
         );
         this.rmqService.ack(context);
         return result;
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
         const result = await this.commandBus.execute(
            new GetSessionsCommand(data.accountId, data.userId, data.currentJti),
         );
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
         const result = await this.commandBus.execute(
            new RevokeSessionCommand(data.sessionId, data.accountId, data.userId, data.deviceInfo),
         );
         this.rmqService.ack(context);
         return result;
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
         const result = await this.commandBus.execute(
            new RevokeOtherSessionsCommand(data.currentJti, data.accountId, data.userId, data.deviceInfo),
         );
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
         changePasswordDto?: ChangePasswordDto;
         dto?: ChangePasswordDto;
         deviceInfo?: IDeviceInfo;
      },
      @Ctx() context: RmqContext,
   ) {
      try {
         const dto = data.changePasswordDto || data.dto!;
         const result = await this.commandBus.execute(
            new ChangePasswordCommand(dto, data.accountId, data.userId, data.deviceInfo),
         );
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
         const result = await this.commandBus.execute(
            new VerifyChangePasswordOtpCommand(data.dto, data.accountId, data.userId, data.deviceInfo),
         );
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
         const result = await this.commandBus.execute(new ValidateTokenCommand(data.token));
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
         const result = await this.commandBus.execute(new GetRolePermissionsCommand(data.roleCode));
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
         const result = await this.commandBus.execute(new GetAuditLogsCommand(message));
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
         const result = await this.commandBus.execute(new GetAuditLogByIdCommand(message));
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
         const result = await this.commandBus.execute(
            new GetAccountAuditLogsCommand(data.accountId, data.userId, data.page, data.limit),
         );
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
         const result = await this.commandBus.execute(new CreateAuditLogCommand(data));
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.GET_EMAIL })
   async getEmail(@Payload() data: { accountId: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetEmailCommand(data.accountId));
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }
}
