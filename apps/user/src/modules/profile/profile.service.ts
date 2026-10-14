import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConflictException, NotFoundException, RetryQueueService, SERVICES } from '@common';
import {
   MEDIA_PATTERNS,
   MEDIA_TYPES,
   MEDIA_FOLDERS,
   formatAvatarFileName,
   type MediaResponseDto,
   type UploadUrlResponseDto,
} from '@contracts/media';
import { OutboxService } from '@user/core/outbox';
import { UserEntity, Gender } from '@user/core/database/entities';
import {
   UserProfileRepository,
   CreateUserData,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { UsernameBloomFilterService } from '@user/modules/authentication/services/username-bloom-filter.service';
import {
   USER_AGGREGATES,
   USER_ERROR_CODES,
   USER_EVENTS,
   USER_OUTBOX_EVENTS,
   USER_RETRY_QUEUES,
   UserDateOfBirthResponseDto,
} from '@contracts/user';
import { UserGraphSyncService } from '@user/modules/follow/services/follow-sync.service';
import { UserResolverService } from '@user/shared/services';

@Injectable()
export class ProfileService {
   private readonly logger = new Logger(ProfileService.name);

   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: UserProfileRepository,
      private readonly userResolverService: UserResolverService,
      @Inject(SERVICES.MEDIA_SERVICE)
      private readonly mediaClient: ClientProxy,
      private readonly outboxService: OutboxService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      private readonly userGraphSyncService: UserGraphSyncService,
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
      @Optional()
      private readonly retryQueueService?: RetryQueueService,
   ) {}

   async getUserById(userId: string): Promise<UserEntity> {
      return this.userResolverService.resolveUser(userId);
   }

   async getUserByAccountId(accountId: string): Promise<UserEntity> {
      return this.userResolverService.resolveByAccountId(accountId);
   }

   async getUserByUserId(userId: string): Promise<UserEntity> {
      return this.userResolverService.resolveUser(userId);
   }

   async getUserByUsername(username: string): Promise<UserEntity> {
      return this.userResolverService.resolveByUsername(username);
   }

   calculateAge(dob?: Date | string | null): number | null {
      if (!dob) {
         return null;
      }
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) {
         return null;
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
         age--;
      }
      return age >= 0 ? age : null;
   }

   async getDateOfBirth(userId: string): Promise<UserDateOfBirthResponseDto> {
      const record = await this.userProfileRepository.findDateOfBirth(userId);
      if (!record) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { userId },
         });
      }

      return {
         userId: record.userId,
         dateOfBirth: record.dateOfBirth,
         age: this.calculateAge(record.dateOfBirth),
      };
   }

   async createUser(data: CreateUserData): Promise<UserEntity> {
      if (data.username) {
         const normalizedUsername = data.username.toLowerCase().trim();
         const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
         if (mightExist) {
            const existingUsername = await this.userProfileRepository.findByUsername(normalizedUsername);
            if (existingUsername) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username: data.username },
               });
            }
         }
      }

      const user = await this.userProfileRepository.create(data);

      if (user.username) {
         await this.usernameBloomFilterService.addUsername(user.username);
      }

      try {
         await this.userGraphSyncService.syncUserToGraph(user);
      } catch (err) {
         this.logger.warn(`Failed to sync user ${user.id} to graph: ${String(err)}`);
         if (this.retryQueueService) {
            await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_USER_TO_GRAPH, {
               id: user.id,
               userId: user.id,
               username: user.username,
               displayName: user.displayName,
               avatar: user.avatar,
               bio: user.bio,
               isPrivate: user.isPrivate,
               createdAt: user.createdAt,
               updatedAt: user.updatedAt,
            });
         }
      }

      await this.outboxService.createOutboxEvent(user.id, USER_AGGREGATES.USER, USER_OUTBOX_EVENTS.USER_CREATED, {
         userId: user.id,
         accountId: user.accountId,
         username: user.username,
      });

      this.emitSearchIndexEvent(USER_EVENTS.CREATED, user);

      return user;
   }

   async updateUserProfile(
      userId: string,
      data: {
         username?: string;
         displayName?: string;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         dateOfBirth?: Date;
         gender?: Gender;
      },
   ): Promise<UserEntity> {
      const user = await this.getUserById(userId);

      if (data.username && data.username.toLowerCase().trim() !== user.username?.toLowerCase().trim()) {
         const normalizedUsername = data.username.toLowerCase().trim();
         const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
         if (mightExist) {
            const existingUsername = await this.userProfileRepository.findByUsername(normalizedUsername);
            if (existingUsername && existingUsername.id !== user.id) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username: data.username },
               });
            }
         }
      }

      const updatedUser = await this.userProfileRepository.update(user.id, data);

      if (data.username && data.username !== user.username) {
         await this.usernameBloomFilterService.addUsername(data.username);
      }

      try {
         await this.userGraphSyncService.syncUserToGraph(updatedUser);
      } catch (err) {
         this.logger.warn(`Failed to sync updated user ${user.id} to graph: ${String(err)}`);
         if (this.retryQueueService) {
            await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_USER_TO_GRAPH, {
               id: updatedUser.id,
               userId: updatedUser.id,
               username: updatedUser.username,
               displayName: updatedUser.displayName,
               avatar: updatedUser.avatar,
               bio: updatedUser.bio,
               isPrivate: updatedUser.isPrivate,
               createdAt: updatedUser.createdAt,
               updatedAt: updatedUser.updatedAt,
            });
         }
      }

      await this.outboxService.createOutboxEvent(user.id, USER_AGGREGATES.USER, USER_OUTBOX_EVENTS.USER_UPDATED, {
         userId: user.id,
         accountId: user.accountId,
         changes: data,
      });

      this.emitSearchIndexEvent(USER_EVENTS.UPDATED, updatedUser);

      return updatedUser;
   }

   async upsertUserProfile(
      userIdOrAccountId: string,
      data: {
         username?: string;
         displayName?: string;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         dateOfBirth?: Date;
         gender?: Gender;
      },
   ): Promise<UserEntity> {
      try {
         return await this.updateUserProfile(userIdOrAccountId, data);
      } catch (err: unknown) {
         const isNotFound =
            err instanceof NotFoundException ||
            (typeof err === 'object' && err !== null && (err as { statusCode?: number }).statusCode === 404);

         if (isNotFound) {
            this.logger.log(`User ${userIdOrAccountId} not found during upsert; creating initial user profile`);
            return await this.createUser({
               accountId: userIdOrAccountId,
               ...data,
            });
         }
         throw err;
      }
   }

   async updateUsername(userId: string, username: string): Promise<UserEntity> {
      const user = await this.getUserById(userId);

      const normalizedUsername = username.toLowerCase().trim();
      if (normalizedUsername === user.username?.toLowerCase().trim()) {
         return user;
      }

      const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
      if (mightExist) {
         const existingUser = await this.userProfileRepository.findByUsername(normalizedUsername);
         if (existingUser && existingUser.id !== user.id) {
            throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
               params: { username },
            });
         }
      }

      const updatedUser = await this.userProfileRepository.update(user.id, { username });
      await this.usernameBloomFilterService.addUsername(username);

      try {
         await this.userGraphSyncService.syncUserToGraph(updatedUser);
      } catch (err) {
         this.logger.warn(`Failed to sync updated username for ${user.id} to graph: ${String(err)}`);
      }

      this.emitSearchIndexEvent(USER_EVENTS.UPDATED, updatedUser);

      return updatedUser;
   }

   async deleteUser(userId: string): Promise<UserEntity> {
      const user = await this.getUserById(userId);

      const deletedUser = await this.userProfileRepository.softDelete(user.id);

      this.emitSearchDeleteEvent(user.id);

      await this.outboxService.createOutboxEvent(user.id, USER_AGGREGATES.USER, USER_OUTBOX_EVENTS.USER_DELETED, {
         userId: user.id,
         accountId: user.accountId,
      });

      return deletedUser;
   }

   async restoreUser(userId: string): Promise<UserEntity> {
      const restoredUser = await this.userProfileRepository.restore(userId);

      this.emitSearchIndexEvent(USER_EVENTS.CREATED, restoredUser);

      await this.outboxService.createOutboxEvent(
         restoredUser.id,
         USER_AGGREGATES.USER,
         USER_OUTBOX_EVENTS.USER_RESTORED,
         {
            userId: restoredUser.id,
            accountId: restoredUser.accountId,
         },
      );

      return restoredUser;
   }

   async uploadAvatar(
      userId: string,
      base64Data: string,
      mimeType?: string,
   ): Promise<{ avatarUrl: string; publicId: string; user: UserEntity }> {
      const user = await this.getUserById(userId);

      this.logger.log(`Uploading avatar via MEDIA_SERVICE for user ${user.id}...`);
      const formattedBase64 =
         mimeType && !base64Data.startsWith('data:') ? `data:${mimeType};base64,${base64Data}` : base64Data;

      const uploadResult = await firstValueFrom(
         this.mediaClient.send<MediaResponseDto>(
            { cmd: MEDIA_PATTERNS.UPLOAD_FILE },
            {
               data: {
                  fileBase64: formattedBase64,
                  fileName: formatAvatarFileName(user.id),
                  mimeType: mimeType || 'image/jpeg',
                  type: MEDIA_TYPES.IMAGE,
                  folder: MEDIA_FOLDERS.AVATARS,
               },
               user: { userId: user.id },
            },
         ),
      );

      const updatedUser = await this.updateUserProfile(user.id, {
         avatar: uploadResult.url,
      });

      return {
         avatarUrl: uploadResult.url,
         publicId: uploadResult.key,
         user: updatedUser,
      };
   }

   async getAvatarUploadSignature(userId: string) {
      const user = await this.getUserById(userId);
      return firstValueFrom(
         this.mediaClient.send<UploadUrlResponseDto>(
            { cmd: MEDIA_PATTERNS.GET_UPLOAD_URL },
            {
               data: {
                  fileName: formatAvatarFileName(user.id),
                  mimeType: 'image/jpeg',
                  type: MEDIA_TYPES.IMAGE,
                  folder: MEDIA_FOLDERS.AVATARS,
               },
               user: { userId: user.id },
            },
         ),
      );
   }

   private emitSearchIndexEvent(event: string, user: UserEntity): void {
      try {
         this.searchClient.emit(event, {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            bio: user.bio,
            isVerified: user.isVerified,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to emit ${event} to Search Service for user ${user.id}: ${String(err)}`);
      }
   }

   private emitSearchDeleteEvent(userId: string): void {
      try {
         this.searchClient.emit(USER_EVENTS.DELETED, { id: userId });
      } catch (err) {
         this.logger.warn(`Failed to emit ${USER_EVENTS.DELETED} to Search Service for user ${userId}: ${String(err)}`);
      }
   }
}
