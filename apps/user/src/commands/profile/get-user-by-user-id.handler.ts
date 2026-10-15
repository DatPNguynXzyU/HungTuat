import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { GetUserByUserIdCommand } from '@user/commands/profile/get-user-by-user-id.command';

@Injectable()
@CommandHandler(GetUserByUserIdCommand)
export class GetUserByUserIdHandler implements ICommandHandler<GetUserByUserIdCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: GetUserByUserIdCommand): Promise<UserEntity> {
      return this.profileService.getUserByUserId(command.userId);
   }
}
