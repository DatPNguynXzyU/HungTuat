import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { UserEntity } from '@user/core/database/entities';
import { USER_PROFILE_REPOSITORY, type IUserProfileRepository } from '@user/modules/profile/repositories';

/**
 * Service responsible for resolving and finding User entities by various identifiers.
 * Encapsulates identifier fallback strategies (userId vs accountId) and standardized exception throwing.
 */
@Injectable()
export class UserResolverService {
   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userRepository: IUserProfileRepository,
   ) {}

   /**
    * Finds a user entity by userId or accountId (tries findById first, then falls back to findByAccountId).
    * Returns null if no matching user is found.
    *
    * @param userIdOrAccountId The internal userId or external accountId
    * @returns The UserEntity or null
    */
   async findUser(userIdOrAccountId: string): Promise<UserEntity | null> {
      let user = await this.userRepository.findById(userIdOrAccountId);
      if (!user) {
         user = await this.userRepository.findByAccountId(userIdOrAccountId);
      }
      return user;
   }

   /**
    * Resolves a user entity by userId or accountId (tries findById first, then falls back to findByAccountId).
    *
    * @param userIdOrAccountId The internal userId or external accountId
    * @returns The resolved UserEntity
    * @throws NotFoundException if user is not found
    */
   async resolveUser(userIdOrAccountId: string): Promise<UserEntity> {
      const user = await this.findUser(userIdOrAccountId);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { id: userIdOrAccountId },
         });
      }
      return user;
   }

   /**
    * Resolves a user entity strictly by userId.
    *
    * @param userId The internal user UUID
    * @returns The resolved UserEntity
    * @throws NotFoundException if user is not found
    */
   async resolveById(userId: string): Promise<UserEntity> {
      const user = await this.userRepository.findById(userId);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { id: userId },
         });
      }
      return user;
   }

   /**
    * Resolves a user entity strictly by external accountId.
    *
    * @param accountId The external account UUID
    * @returns The resolved UserEntity
    * @throws NotFoundException if user is not found
    */
   async resolveByAccountId(accountId: string): Promise<UserEntity> {
      const user = await this.userRepository.findByAccountId(accountId);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { accountId },
         });
      }
      return user;
   }

   /**
    * Resolves a user entity strictly by username.
    *
    * @param username The unique username handle
    * @returns The resolved UserEntity
    * @throws NotFoundException if user is not found
    */
   async resolveByUsername(username: string): Promise<UserEntity> {
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { username },
         });
      }
      return user;
   }

   /**
    * Finds a user entity strictly by external accountId without throwing.
    *
    * @param accountId The external account UUID
    * @returns The UserEntity or null
    */
   async findByAccountId(accountId: string): Promise<UserEntity | null> {
      return this.userRepository.findByAccountId(accountId);
   }

   /**
    * Finds a user entity strictly by username without throwing.
    *
    * @param username The unique username handle
    * @returns The UserEntity or null
    */
   async findByUsername(username: string): Promise<UserEntity | null> {
      return this.userRepository.findByUsername(username);
   }
}
