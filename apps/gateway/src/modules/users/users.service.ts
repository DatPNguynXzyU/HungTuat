import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES, UpdateUserDto } from '@common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UsersService {
   constructor(@Inject(SERVICES.USER_SERVICE) private readonly userClient: ClientProxy) {
      // NQHxZeion
   }

   async getUserById(id: string): Promise<unknown> {
      return firstValueFrom(this.userClient.send<unknown, { id: string }>({ cmd: 'users.get_by_id' }, { id }));
   }

   async getAllUsers(page = 1, limit = 10): Promise<unknown> {
      return firstValueFrom(
         this.userClient.send<unknown, { page: number; limit: number }>({ cmd: 'users.get_all' }, { page, limit }),
      );
   }

   async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<unknown> {
      return firstValueFrom(
         this.userClient.send<unknown, { id: string } & UpdateUserDto>(
            { cmd: 'users.update' },
            { id, ...updateUserDto },
         ),
      );
   }
}
