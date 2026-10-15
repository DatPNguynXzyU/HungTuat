import { Command, type IServiceMessage } from '@common';
import type { UserEntity } from '@user/core/database/entities';

export interface UploadAvatarResult {
   avatarUrl: string;
   publicId: string;
   user: UserEntity;
}

export class UploadAvatarCommand extends Command<UploadAvatarResult> {
   constructor(public readonly message: IServiceMessage<{ userId?: string; fileBase64: string; mimeType?: string }>) {
      super();
   }
}
