import { Module } from '@nestjs/common';
import { RmqModule } from '@common';
import { PrismaModule } from '@media/prisma';
import { StorageModule } from '@media/storage';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './repositories/media.repository';
import { MEDIA_REPOSITORY } from './repositories/media.repository.interface';

@Module({
   imports: [PrismaModule, StorageModule, RmqModule],
   controllers: [MediaController],
   providers: [
      MediaService,
      MediaRepository,
      {
         provide: MEDIA_REPOSITORY,
         useClass: MediaRepository,
      },
   ],
   exports: [MediaService, MediaRepository, MEDIA_REPOSITORY],
})
export class MediaDomainModule {}
