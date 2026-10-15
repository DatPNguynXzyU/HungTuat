import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { GetUserByAccountIdCommand } from '@user/commands/profile/get-user-by-account-id.command';

@Injectable()
@CommandHandler(GetUserByAccountIdCommand)
export class GetUserByAccountIdHandler implements ICommandHandler<GetUserByAccountIdCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: GetUserByAccountIdCommand): Promise<UserEntity> {
      return this.profileService.getUserByAccountId(command.accountId);
   }
}
