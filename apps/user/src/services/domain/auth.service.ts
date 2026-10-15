import { Injectable, Logger } from '@nestjs/common';
import { ConflictException } from '@common';
import { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { UserProfileDataBuilder } from '@user/builders';

/**
 * AuthService coordinates user authentication synchronization events and username checks:
 * - Checks username availability via UsernameBloomFilterService
 * - Handles USER_REGISTERED event to provision initial user profile and fallback unique handles
 */
@Injectable()
export class AuthService {
   private readonly logger = new Logger(AuthService.name);

   constructor(
      private readonly userResolverService: UserResolverService,
      private readonly profileService: ProfileService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
   ) {}

   async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
      const normalizedUsername = username.toLowerCase().trim();
      const available = await this.usernameBloomFilterService.isUsernameAvailable(normalizedUsername);
      return { available, username: normalizedUsername };
   }

   async handleUserRegistered(data: { accountId: string; email?: string }): Promise<UserEntity | null> {
      if (!data.accountId) {
         return null;
      }
      const existing = await this.userResolverService.findByAccountId(data.accountId);
      if (existing) {
         return existing;
      }

      let username: string | undefined;
      const displayName = data.email?.includes('@') ? data.email.split('@')[0].trim().toLowerCase() : undefined;

      if (displayName) {
         const baseUsername = displayName;
         const isAvailable = await this.usernameBloomFilterService.isUsernameAvailable(baseUsername);
         if (isAvailable) {
            username = baseUsername;
         } else {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            username = `${baseUsername}_${randomSuffix}`;
         }
      }

      try {
         const initialData = UserProfileDataBuilder.create()
            .withAccountId(data.accountId)
            .withUsername(username)
            .withDisplayName(displayName)
            .build();

         return await this.profileService.createUser(initialData);
      } catch (err: unknown) {
         const createdUser = await this.userResolverService.findByAccountId(data.accountId);
         if (createdUser) {
            return createdUser;
         }

         if (err instanceof ConflictException && displayName && username) {
            const retryUsername = `${displayName}_${Math.floor(10000 + Math.random() * 90000)}`;
            try {
               const retryData = UserProfileDataBuilder.create()
                  .withAccountId(data.accountId)
                  .withUsername(retryUsername)
                  .withDisplayName(displayName)
                  .build();

               return await this.profileService.createUser(retryData);
            } catch {
               const finalCheck = await this.userResolverService.findByAccountId(data.accountId);
               if (finalCheck) {
                  return finalCheck;
               }
            }
         }

         throw err;
      }
   }
}
