import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/notification-client';
import { NotificationConfigService } from '@notification/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
   constructor(@Optional() configService?: NotificationConfigService) {
      const url = configService?.databaseUrl || process.env.DATABASE_URL;
      super(
         url
            ? {
                 datasources: {
                    db: {
                       url,
                    },
                 },
              }
            : undefined,
      );
   }

   async onModuleInit(): Promise<void> {
      await this.$connect();
   }

   async onModuleDestroy(): Promise<void> {
      await this.$disconnect();
   }
}
