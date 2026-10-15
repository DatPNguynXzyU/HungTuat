import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { ProfileService } from '@user/services/domain/profile.service';
import { UploadAvatarCommand, type UploadAvatarResult } from '@user/commands/profile/upload-avatar.command';

@Injectable()
@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler implements ICommandHandler<UploadAvatarCommand, UploadAvatarResult> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: UploadAvatarCommand): Promise<UploadAvatarResult> {
      const { message } = command;
      const targetUserId = message.data.userId || message.user?.userId;
      if (!targetUserId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }
      checkOwnershipOrAdmin(message, targetUserId);

      return this.profileService.uploadAvatar(targetUserId, message.data.fileBase64, message.data.mimeType);
   }
}
