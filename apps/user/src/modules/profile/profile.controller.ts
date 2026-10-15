import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { USER_PATTERNS } from '@contracts/user';
import type { IServiceMessage } from '@common';
import type { Gender } from '@user/core/database/entities';
import {
   CreateProfileCommand,
   CreateUserCommand,
   DeleteUserCommand,
   GetAvatarUploadSignatureCommand,
   GetDateOfBirthCommand,
   GetUserByAccountIdCommand,
   GetUserByIdCommand,
   GetUserByUserIdCommand,
   GetUserByUsernameCommand,
   RestoreUserCommand,
   UpdateUsernameCommand,
   UpdateUserProfileCommand,
   UploadAvatarCommand,
   UpsertUserProfileCommand,
} from '@user/commands/profile';

/**
 * ProfileController acts as a transport adapter dispatching commands
 * to the CommandBus layer, decoupling the transport layer from concrete services.
 */
@Controller()
export class ProfileController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: USER_PATTERNS.CREATE_PROFILE })
   @MessagePattern({ cmd: USER_PATTERNS.CREATE_USER_PROFILE })
   async createProfile(
      @Payload()
      message: IServiceMessage<{
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         accountId?: string;
         userId?: string;
      }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new CreateProfileCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.CREATE_USER })
   async createUser(
      @Payload()
      data: {
         accountId: string;
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
      },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new CreateUserCommand(data));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_ID })
   async getUserById(@Payload() message: IServiceMessage<{ userId: string }>, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByIdCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_USER_ID })
   async getUserByUserId(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByUserIdCommand(data.userId));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_ACCOUNT_ID })
   async getUserByAccountId(@Payload() data: { accountId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByAccountIdCommand(data.accountId));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_USERNAME })
   async getUserByUsername(@Payload() data: { username: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByUsernameCommand(data.username));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_DATE_OF_BIRTH })
   async getDateOfBirth(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetDateOfBirthCommand(data?.userId));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USER_PROFILE })
   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USER })
   async updateUserProfile(
      @Payload()
      message: IServiceMessage<{
         userId: string;
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
      }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UpdateUserProfileCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.UPSERT_USER_PROFILE })
   async upsertUserProfile(
      @Payload()
      message: IServiceMessage<{
         userId: string;
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
      }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UpsertUserProfileCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USERNAME })
   async updateUsername(
      @Payload() message: IServiceMessage<{ userId: string; username: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UpdateUsernameCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.DELETE_USER })
   async deleteUser(@Payload() message: IServiceMessage<{ userId: string }>, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new DeleteUserCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.RESTORE_USER })
   async restoreUser(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new RestoreUserCommand(data.userId));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.UPLOAD_AVATAR })
   async uploadAvatar(
      @Payload() message: IServiceMessage<{ userId?: string; fileBase64: string; mimeType?: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UploadAvatarCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_AVATAR_UPLOAD_SIGNATURE })
   async getAvatarUploadSignature(
      @Payload() message: IServiceMessage<{ userId?: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new GetAvatarUploadSignatureCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }
}
