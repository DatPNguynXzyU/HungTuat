import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, type ICommandHandler } from '@common';
import { USER_ERROR_CODES, type UserDateOfBirthResponseDto } from '@contracts/user';
import { ProfileService } from '@user/services/domain/profile.service';
import { GetDateOfBirthCommand } from '@user/commands/profile/get-date-of-birth.command';

@Injectable()
@CommandHandler(GetDateOfBirthCommand)
export class GetDateOfBirthHandler implements ICommandHandler<GetDateOfBirthCommand, UserDateOfBirthResponseDto> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: GetDateOfBirthCommand): Promise<UserDateOfBirthResponseDto> {
      if (!command.userId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }
      return this.profileService.getDateOfBirth(command.userId);
   }
}
