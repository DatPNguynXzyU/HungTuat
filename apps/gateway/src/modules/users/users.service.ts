import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserProfileDto, IServiceMessage, SERVICES, UpdateUserDto } from '@common';
import { firstValueFrom } from 'rxjs';
import type { JwtPayload } from '@common/utils/jwt.util';

@Injectable()
export class UsersService {
   constructor(@Inject(SERVICES.USER_SERVICE) private readonly userClient: ClientProxy) {}

   async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
      return firstValueFrom(
         this.userClient.send<{ available: boolean; username: string }, { username: string }>(
            { cmd: 'check_username' },
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
         this.userClient.send<unknown, IServiceMessage<CreateUserProfileDto>>({ cmd: 'create_profile' }, message),
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
         this.userClient.send<unknown, IServiceMessage<{ id: string }>>({ cmd: 'get_user_by_id' }, message),
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
            { cmd: 'users.get_all' },
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
            { cmd: 'update_user_profile' },
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

   async searchUsers(query: string, limit = 10, page = 1): Promise<unknown> {
      const skip = (page - 1) * limit;
      return firstValueFrom(
         this.userClient.send<unknown, { query: string; limit: number; skip: number }>(
            { cmd: 'search_users' },
            { query, limit, skip },
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
            { cmd: 'upload_avatar' },
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
            { cmd: 'get_avatar_upload_signature' },
            message,
         ),
      );
   }
}
