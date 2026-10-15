import { Command, type IServiceMessage } from '@common';
import type { UploadUrlResponseDto } from '@contracts/media';

export class GetAvatarUploadSignatureCommand extends Command<UploadUrlResponseDto> {
   constructor(public readonly message: IServiceMessage<{ userId?: string }>) {
      super();
   }
}
