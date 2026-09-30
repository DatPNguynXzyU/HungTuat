import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES, UpdateUserDto, IServiceMessage } from '@common';
import { firstValueFrom } from 'rxjs';
import type { JwtPayload } from '@common/utils/jwt.util';

@Injectable()
export class UsersService {
   constructor(@Inject(SERVICES.USER_SERVICE) private readonly userClient: ClientProxy) {}

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
}
