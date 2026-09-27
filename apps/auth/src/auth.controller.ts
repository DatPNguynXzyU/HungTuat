import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { AUTH_PATTERNS, ChangePasswordDto, LoginDto, RegisterDto, RmqService } from '@common';
import { AuthService } from '@auth/auth.service';

@Controller()
export class AuthController {
   constructor(
      private readonly authService: AuthService,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: AUTH_PATTERNS.REGISTER })
   async register(@Payload() data: RegisterDto, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.register(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.LOGIN })
   async login(@Payload() data: LoginDto, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.login(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REFRESH_TOKEN })
   async refreshToken(@Payload() data: { refreshToken: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.refreshToken(data.refreshToken);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_TOKEN })
   async revokeToken(@Payload() data: { token: string }, @Ctx() context: RmqContext) {
      try {
         const result = await this.authService.revokeToken(data.token);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.REVOKE_ALL_USER_TOKENS })
   async revokeAllUserTokens(@Payload() data: { userId: string }, @Ctx() context: RmqContext) {
      try {
         await this.authService.revokeAllUserTokens(data.userId);
         this.rmqService.ack(context);
         return { success: true, message: 'All tokens revoked successfully' };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.LOGOUT_ALL })
   async logoutAll(@Payload() data: { userId: string }, @Ctx() context: RmqContext) {
      try {
         await this.authService.logoutAll(data.userId);
         this.rmqService.ack(context);
         return { success: true, message: 'All sessions logged out successfully' };
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @MessagePattern({ cmd: AUTH_PATTERNS.CHANGE_PASSWORD })
   async changePassword(
      @Payload() data: { userId: string; changePasswordDto: ChangePasswordDto },
      @Ctx() context: RmqContext,
   ) {
      try {
         const result = await this.authService.changePassword(data.userId, data.changePasswordDto);
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
}
