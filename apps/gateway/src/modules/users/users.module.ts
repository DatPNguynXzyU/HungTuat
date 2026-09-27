import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.USER_SERVICE,
      }),
   ],
   controllers: [UsersController],
   providers: [UsersService],
   exports: [UsersService],
})
export class UsersModule {}
