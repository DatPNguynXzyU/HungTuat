import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IServiceMessage, SERVICES } from '@common';
import { CreateUserProfileDto, UpdateUserDto, UserDateOfBirthResponseDto, USER_PATTERNS } from '@contracts/user';
import { firstValueFrom } from 'rxjs';
import type { JwtPayload } from '@common/utils/jwt.util';

@Injectable()
export class UsersService {
   constructor(@Inject(SERVICES.USER_SERVICE) private readonly userClient: ClientProxy) {}

   async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
      return firstValueFrom(
         this.userClient.send<{ available: boolean; username: string }, { username: string }>(
            { cmd: USER_PATTERNS.CHECK_USERNAME },
            { username },
         ),
      );
   }

   async createProfile(createUserProfileDto: CreateUserProfileDto, user: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<CreateUserProfileDto> = {
         data: createUserProfileDto,
         user: {
            userId: user.sub,
            email: user.email,
            roles: user.roles || [],
            permissions: [],
            sessionId: user.jti,
         },
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<CreateUserProfileDto>>(
            { cmd: USER_PATTERNS.CREATE_PROFILE },
            message,
         ),
      );
   }

   async getUserById(id: string, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string }> = {
         data: { id },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string }>>({ cmd: USER_PATTERNS.GET_USER_BY_ID }, message),
      );
   }

   async getAllUsers(page = 1, limit = 10, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ page: number; limit: number }> = {
         data: { page, limit },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ page: number; limit: number }>>(
            { cmd: USER_PATTERNS.GET_ALL_USERS },
            message,
         ),
      );
   }

   async updateUser(id: string, updateUserDto: UpdateUserDto, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string } & UpdateUserDto> = {
         data: { id, ...updateUserDto },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string } & UpdateUserDto>>(
            { cmd: USER_PATTERNS.UPDATE_USER_PROFILE },
            message,
         ),
      );
   }

   async getMyProfile(user: JwtPayload): Promise<unknown> {
      return this.getUserById(user.sub, user);
   }

   async updateMyProfile(updateUserDto: UpdateUserDto, user: JwtPayload): Promise<unknown> {
      return this.updateUser(user.sub, updateUserDto, user);
   }

   async searchUsers(query: string, limit = 10, cursor?: string, user?: JwtPayload): Promise<unknown> {
      return firstValueFrom(
         this.userClient.send<unknown, { query: string; limit: number; cursor?: string; currentUserId?: string }>(
            { cmd: USER_PATTERNS.SEARCH_USERS },
            { query, limit, cursor, currentUserId: user?.sub },
         ),
      );
   }

   async getFollowSuggestions(limit = 10, user: JwtPayload): Promise<unknown> {
      return firstValueFrom(
         this.userClient.send<unknown, { userId: string; limit: number }>(
            { cmd: USER_PATTERNS.GET_FOLLOW_SUGGESTIONS },
            { userId: user.sub, limit },
         ),
      );
   }

   async uploadAvatar(id: string, fileBase64: string, mimeType?: string, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string; fileBase64: string; mimeType?: string }> = {
         data: { id, fileBase64, mimeType },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string; fileBase64: string; mimeType?: string }>>(
            { cmd: USER_PATTERNS.UPLOAD_AVATAR },
            message,
         ),
      );
   }

   async getAvatarUploadSignature(id: string, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string }> = {
         data: { id },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string }>>(
            { cmd: USER_PATTERNS.GET_AVATAR_UPLOAD_SIGNATURE },
            message,
         ),
      );
   }

   async getDateOfBirth(userId: string): Promise<UserDateOfBirthResponseDto> {
      return firstValueFrom(
         this.userClient.send<UserDateOfBirthResponseDto, { userId: string }>(
            { cmd: USER_PATTERNS.GET_DATE_OF_BIRTH },
            { userId },
         ),
      );
   }
}
