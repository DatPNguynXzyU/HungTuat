import { Module } from '@nestjs/common';
import { RmqModule } from '@common';
import { PrismaModule } from '@media/prisma';
import { StorageModule } from '@media/storage';
import { MediaController } from '@media/modules/media/media.controller';
import { MediaService } from '@media/modules/media/media.service';
import { MediaRepository } from '@media/modules/media/repositories/media.repository';
import { MEDIA_REPOSITORY } from '@media/modules/media/repositories/media.repository.interface';

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
