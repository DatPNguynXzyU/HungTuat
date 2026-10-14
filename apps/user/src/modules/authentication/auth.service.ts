import { Injectable, Logger } from '@nestjs/common';
import { ConflictException } from '@common';
import { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/modules/profile/profile.service';
import { UsernameBloomFilterService } from '@user/modules/authentication/services/username-bloom-filter.service';
import { EmailValidatorService } from '@user/modules/authentication/services/email-validator.service';
import { UserResolverService } from '@user/shared/services';

@Injectable()
export class AuthService {
   private readonly logger = new Logger(AuthService.name);

   constructor(
      private readonly userResolverService: UserResolverService,
      private readonly profileService: ProfileService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      private readonly emailValidatorService: EmailValidatorService,
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
      const displayName = data.email ? this.emailValidatorService.extractBaseUsername(data.email) : undefined;

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
         return await this.profileService.createUser({
            accountId: data.accountId,
            username,
            displayName,
         });
      } catch (err: unknown) {
         const createdUser = await this.userResolverService.findByAccountId(data.accountId);
         if (createdUser) {
            return createdUser;
         }

         if (err instanceof ConflictException && displayName && username) {
            const retryUsername = `${displayName}_${Math.floor(10000 + Math.random() * 90000)}`;
            try {
               return await this.profileService.createUser({
                  accountId: data.accountId,
                  username: retryUsername,
                  displayName,
               });
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
