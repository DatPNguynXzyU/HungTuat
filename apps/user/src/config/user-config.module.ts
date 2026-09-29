import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserConfigService } from '@user/config/user-config.service';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: 'apps/user/.env',
      }),
   ],
   providers: [UserConfigService],
   exports: [UserConfigService],
})
export class UserConfigModule {}
