import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { MediaController } from '@gateway/modules/media/media.controller';
import { MediaService } from '@gateway/modules/media/media.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.MEDIA_SERVICE,
      }),
   ],
   controllers: [MediaController],
   providers: [MediaService],
   exports: [MediaService],
})
export class MediaModule {}
