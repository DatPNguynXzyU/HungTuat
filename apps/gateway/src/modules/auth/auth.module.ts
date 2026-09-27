import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.AUTH_SERVICE,
      }),
   ],
   controllers: [AuthController],
   providers: [AuthService],
   exports: [AuthService],
})
export class AuthModule {}
