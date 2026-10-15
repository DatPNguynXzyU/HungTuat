import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { GetUserByUsernameCommand } from '@user/commands/profile/get-user-by-username.command';

@Injectable()
@CommandHandler(GetUserByUsernameCommand)
export class GetUserByUsernameHandler implements ICommandHandler<GetUserByUsernameCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: GetUserByUsernameCommand): Promise<UserEntity> {
      return this.profileService.getUserByUsername(command.username);
   }
}
