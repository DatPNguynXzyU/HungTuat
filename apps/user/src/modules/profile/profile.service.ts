import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   CloudinaryService,
   ConflictException,
   NotFoundException,
   SERVICES,
   USER_ERROR_CODES,
   USER_EVENTS,
   UserDateOfBirthResponseDto,
} from '@common';
import { OutboxService } from '@user/core/outbox';
import { UserEntity, Gender } from '@user/core/database/entities';
import {
   UserProfileRepository,
   CreateUserData,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { UsernameBloomFilterService } from '@user/modules/authentication';
import { UserGraphSyncService } from '@user/modules/follow';

@Injectable()
export class ProfileService {
   private readonly logger = new Logger(ProfileService.name);

   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: UserProfileRepository,
      private readonly cloudinaryService: CloudinaryService,
      private readonly outboxService: OutboxService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      private readonly userGraphSyncService: UserGraphSyncService,
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
   ) {}

   async getUserById(id: string): Promise<UserEntity> {
      let user = await this.userProfileRepository.findById(id);
      if (!user) {
         user = await this.userProfileRepository.findByAccountId(id);
      }
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { id },
         });
      }
      return user;
   }

   async getUserByAccountId(accountId: string): Promise<UserEntity> {
      const user = await this.userProfileRepository.findByAccountId(accountId);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { accountId },
         });
      }
      return user;
   }

   async getUserByUserId(userId: string): Promise<UserEntity> {
      return this.getUserById(userId);
   }

   async getUserByUsername(username: string): Promise<UserEntity> {
      const user = await this.userProfileRepository.findByUsername(username);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { username },
         });
      }
      return user;
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
      }

      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserCreated', {
         userId: user.id,
         accountId: user.accountId,
         username: user.username,
      });

      this.emitSearchIndexEvent(USER_EVENTS.CREATED, user);

      return user;
   }

   async updateUserProfile(
      id: string,
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
      let user = await this.userProfileRepository.findById(id);
      if (!user) {
         user = await this.userProfileRepository.findByAccountId(id);
      }

      if (!user) {
         this.logger.log(`User ${id} not found during profile update; auto-creating initial user and profile`);
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

         user = await this.userProfileRepository.create({
            accountId: id,
            username: data.username,
            displayName: data.displayName,
            bio: data.bio,
            avatar: data.avatar,
            coverImage: data.coverImage,
            website: data.website,
            location: data.location,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
         });

         if (user.username) {
            await this.usernameBloomFilterService.addUsername(user.username);
         }

         try {
            await this.userGraphSyncService.syncUserToGraph(user);
         } catch (err) {
            this.logger.warn(`Failed to sync newly created user ${user.id} to graph: ${String(err)}`);
         }

         this.emitSearchIndexEvent(USER_EVENTS.CREATED, user);

         return user;
      }

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
      }

      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserUpdated', {
         userId: user.id,
         accountId: user.accountId,
         changes: data,
      });

      this.emitSearchIndexEvent(USER_EVENTS.UPDATED, updatedUser);

      return updatedUser;
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

      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserDeleted', {
         userId: user.id,
         accountId: user.accountId,
      });

      return deletedUser;
   }

   async restoreUser(userId: string): Promise<UserEntity> {
      const restoredUser = await this.userProfileRepository.restore(userId);

      this.emitSearchIndexEvent(USER_EVENTS.CREATED, restoredUser);

      await this.outboxService.createOutboxEvent(restoredUser.id, 'User', 'UserRestored', {
         userId: restoredUser.id,
         accountId: restoredUser.accountId,
      });

      return restoredUser;
   }

   async uploadAvatar(
      id: string,
      base64Data: string,
      mimeType?: string,
   ): Promise<{ avatarUrl: string; publicId: string; user: UserEntity }> {
      const user = await this.getUserById(id);

      this.logger.log(`Uploading avatar to Cloudinary for user ${user.id}...`);
      const formattedBase64 =
         mimeType && !base64Data.startsWith('data:') ? `data:${mimeType};base64,${base64Data}` : base64Data;

      const uploadResult = await this.cloudinaryService.uploadBase64(formattedBase64, {
         folder: 'omni/users/avatars',
         public_id: `avatar_${user.id}_${Date.now()}`,
         transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
         ],
         tags: ['avatar', user.id, user.accountId],
      });

      const updatedUser = await this.updateUserProfile(user.id, {
         avatar: uploadResult.secureUrl,
      });

      return {
         avatarUrl: uploadResult.secureUrl,
         publicId: uploadResult.publicId,
         user: updatedUser,
      };
   }

   async getAvatarUploadSignature(userId: string) {
      const user = await this.getUserById(userId);
      return this.cloudinaryService.generateUploadSignature({
         folder: 'omni/users/avatars',
         tags: `avatar,${user.id},${user.accountId}`,
      });
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
