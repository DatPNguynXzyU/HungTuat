import { Module } from '@nestjs/common';
import { RmqModule } from '@common';
import { MediaConfigModule } from '@media/config';
import { MediaLoggerModule } from '@media/logger';
import { PrismaModule } from '@media/prisma';
import { StorageModule } from '@media/storage';
import { MediaDomainModule } from '@media/modules/media';

@Module({
   imports: [MediaConfigModule, MediaLoggerModule, RmqModule, PrismaModule, StorageModule, MediaDomainModule],
   exports: [MediaDomainModule, StorageModule, PrismaModule],
})
export class MediaModule {}
