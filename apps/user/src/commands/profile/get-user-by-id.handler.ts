import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { GetUserByIdCommand } from '@user/commands/profile/get-user-by-id.command';

@Injectable()
@CommandHandler(GetUserByIdCommand)
export class GetUserByIdHandler implements ICommandHandler<GetUserByIdCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: GetUserByIdCommand): Promise<UserEntity> {
      const { message } = command;
      try {
         return await this.profileService.getUserById(message.data.userId);
      } catch (err) {
         if (message.user && message.user.userId === message.data.userId) {
            try {
               const autoCreated = await this.profileService.createUser({
                  accountId: message.user.userId,
               });
               if (autoCreated) {
                  return autoCreated;
               }
            } catch {
               const fallbackUser = await this.profileService.getUserById(message.data.userId);
               if (fallbackUser) {
                  return fallbackUser;
               }
            }
         }
         throw err;
      }
   }
}
