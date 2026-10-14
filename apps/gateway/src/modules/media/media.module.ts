import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

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
