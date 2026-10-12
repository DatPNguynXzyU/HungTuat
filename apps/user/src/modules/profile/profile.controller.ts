import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { BadRequestException, checkOwnershipOrAdmin, RmqService, USER_ERROR_CODES, USER_PATTERNS } from '@common';
import type { IServiceMessage } from '@common';
import { Gender } from '@user/core/database/entities';
import { ProfileService } from '@user/modules/profile/profile.service';

@Controller()
export class ProfileController {
   constructor(
      private readonly profileService: ProfileService,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: USER_PATTERNS.CREATE_PROFILE })
   @MessagePattern({ cmd: USER_PATTERNS.CREATE_USER_PROFILE })
   async createProfile(
      @Payload()
      message: IServiceMessage<{
         username?: string;
         displayName?: string;
         gender?: string;
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
         const accountId = message.data?.accountId || message.user?.userId || message.data?.userId;
         if (!accountId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }

         const { gender, dateOfBirth, ...profileData } = message.data;

         const result = await this.profileService.createUser({
            accountId,
            ...profileData,
            ...(gender && { gender: gender as Gender }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
         });
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
         gender?: string;
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
         const { accountId, gender, dateOfBirth, ...profileData } = data;
         const result = await this.profileService.createUser({
            accountId,
            ...profileData,
            ...(gender && { gender: gender as Gender }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
         });
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
   async getUserById(@Payload() message: IServiceMessage<{ id: string }>, @Ctx() context?: RmqContext) {
      try {
         try {
            const result = await this.profileService.getUserById(message.data.id);
            if (context) {
               this.rmqService.ack(context);
            }
            return result;
         } catch (err) {
            if (message.user && message.user.userId === message.data.id) {
               try {
                  const autoCreated = await this.profileService.createUser({
                     accountId: message.user.userId,
                  });
                  if (autoCreated) {
                     if (context) {
                        this.rmqService.ack(context);
                     }
                     return autoCreated;
                  }
               } catch {
                  const fallbackUser = await this.profileService.getUserById(message.data.id);
                  if (fallbackUser) {
                     if (context) {
                        this.rmqService.ack(context);
                     }
                     return fallbackUser;
                  }
               }
            }
            throw err;
         }
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
         const result = await this.profileService.getUserByUserId(data.userId);
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
         const result = await this.profileService.getUserByAccountId(data.accountId);
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
         const result = await this.profileService.getUserByUsername(data.username);
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
         if (!data?.userId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         const result = await this.profileService.getDateOfBirth(data.userId);
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
         id: string;
         username?: string;
         displayName?: string;
         gender?: string;
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
         const { id, gender, dateOfBirth, ...updateData } = message.data;

         let targetOwnerId = id;
         try {
            const existingUser = await this.profileService.getUserById(id);
            if (existingUser) {
               targetOwnerId = existingUser.accountId;
            }
         } catch {
            // User does not exist in DB yet, fallback to comparing id with message.user.userId
         }

         checkOwnershipOrAdmin(message, targetOwnerId);

         const result = await this.profileService.updateUserProfile(id, {
            ...updateData,
            ...(gender && { gender: gender as Gender }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
         });
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
      @Payload() message: IServiceMessage<{ id: string; username: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const user = await this.profileService.getUserById(message.data.id);
         if (user) {
            checkOwnershipOrAdmin(message, user.accountId);
         }

         const result = await this.profileService.updateUsername(user.id, message.data.username);
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
   async deleteUser(@Payload() message: IServiceMessage<{ id: string }>, @Ctx() context?: RmqContext) {
      try {
         const user = await this.profileService.getUserById(message.data.id);
         if (user) {
            checkOwnershipOrAdmin(message, user.accountId);
         }

         const result = await this.profileService.deleteUser(user.id);
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
   async restoreUser(@Payload() data: { id: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.profileService.restoreUser(data.id);
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
      @Payload() message: IServiceMessage<{ id?: string; fileBase64: string; mimeType?: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const targetUserId = message.data.id || message.user?.userId;
         if (!targetUserId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         checkOwnershipOrAdmin(message, targetUserId);

         const result = await this.profileService.uploadAvatar(
            targetUserId,
            message.data.fileBase64,
            message.data.mimeType,
         );
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
   async getAvatarUploadSignature(@Payload() message: IServiceMessage<{ id?: string }>, @Ctx() context?: RmqContext) {
      try {
         const targetUserId = message.data.id || message.user?.userId;
         if (!targetUserId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         checkOwnershipOrAdmin(message, targetUserId);

         const result = await this.profileService.getAvatarUploadSignature(targetUserId);
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
