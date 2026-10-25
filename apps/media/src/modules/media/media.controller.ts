import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import {
   MEDIA_PATTERNS,
   type GetUploadUrlDto,
   type UploadFileDto,
   type ConfirmUploadDto,
   type GetMediaByIdDto,
   type DeleteMediaDto,
} from '@contracts/media';
import { QUEUES, RmqService, type IServiceMessage, UnauthorizedException } from '@common';
import { MediaService } from '@media/modules/media/media.service';

/**
 * RabbitMQ Inbound Adapter for Media Microservice.
 * @deprecated Synchronous RPC calls over RabbitMQ are deprecated. All client operations
 * (getUploadUrl, uploadFile, confirmUpload, getMediaById, deleteMedia) are handled via MediaGrpcController.
 * This controller is preserved temporarily for backward compatibility.
 */
@Controller()
export class MediaController {
   constructor(
      private readonly mediaService: MediaService,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: MEDIA_PATTERNS.GET_UPLOAD_URL })
   async getUploadUrl(@Payload() message: IServiceMessage<GetUploadUrlDto>, @Ctx() context?: RmqContext) {
      try {
         const userId = message.user?.userId;
         if (!userId) {
            throw new UnauthorizedException();
         }
         const result = await this.mediaService.getUploadUrl(userId, message.data);
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            await this.rmqService.handleError(error, context, { queue: QUEUES.MEDIA });
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: MEDIA_PATTERNS.UPLOAD_FILE })
   async uploadFile(@Payload() message: IServiceMessage<UploadFileDto>, @Ctx() context?: RmqContext) {
      try {
         const userId = message.user?.userId;
         if (!userId) {
            throw new UnauthorizedException();
         }
         const result = await this.mediaService.uploadFile(userId, message.data);
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            await this.rmqService.handleError(error, context, { queue: QUEUES.MEDIA });
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: MEDIA_PATTERNS.CONFIRM_UPLOAD })
   async confirmUpload(@Payload() message: IServiceMessage<ConfirmUploadDto>, @Ctx() context?: RmqContext) {
      try {
         const userId = message.user?.userId;
         if (!userId) {
            throw new UnauthorizedException();
         }
         const result = await this.mediaService.confirmUpload(userId, message.data);
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            await this.rmqService.handleError(error, context, { queue: QUEUES.MEDIA });
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: MEDIA_PATTERNS.GET_MEDIA_BY_ID })
   async getMediaById(@Payload() message: IServiceMessage<GetMediaByIdDto>, @Ctx() context?: RmqContext) {
      try {
         const result = await this.mediaService.getMediaById(message.data.id);
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            await this.rmqService.handleError(error, context, { queue: QUEUES.MEDIA });
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: MEDIA_PATTERNS.DELETE_MEDIA })
   async deleteMedia(@Payload() message: IServiceMessage<DeleteMediaDto>, @Ctx() context?: RmqContext) {
      try {
         const result = await this.mediaService.deleteMedia(message.data.id, message);
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            await this.rmqService.handleError(error, context, { queue: QUEUES.MEDIA });
         }
         throw error;
      }
   }
}
