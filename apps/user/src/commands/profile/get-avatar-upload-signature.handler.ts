import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import type { UploadUrlResponseDto } from '@contracts/media';
import { USER_ERROR_CODES } from '@contracts/user';
import { ProfileService } from '@user/services/domain/profile.service';
import { GetAvatarUploadSignatureCommand } from '@user/commands/profile/get-avatar-upload-signature.command';

@Injectable()
@CommandHandler(GetAvatarUploadSignatureCommand)
export class GetAvatarUploadSignatureHandler implements ICommandHandler<
   GetAvatarUploadSignatureCommand,
   UploadUrlResponseDto
> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: GetAvatarUploadSignatureCommand): Promise<UploadUrlResponseDto> {
      const { message } = command;
      const targetUserId = message.data.userId || message.user?.userId;
      if (!targetUserId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }
      checkOwnershipOrAdmin(message, targetUserId);

      return this.profileService.getAvatarUploadSignature(targetUserId);
   }
}
