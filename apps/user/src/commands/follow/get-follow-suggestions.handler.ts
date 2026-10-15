import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, type ICommandHandler } from '@common';
import { USER_ERROR_CODES, type UserSuggestionItemDto } from '@contracts/user';
import { FollowService } from '@user/services/domain/follow.service';
import { GetFollowSuggestionsCommand } from '@user/commands/follow/get-follow-suggestions.command';

@Injectable()
@CommandHandler(GetFollowSuggestionsCommand)
export class GetFollowSuggestionsHandler implements ICommandHandler<
   GetFollowSuggestionsCommand,
   UserSuggestionItemDto[]
> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: GetFollowSuggestionsCommand): Promise<UserSuggestionItemDto[]> {
      if (!command.userId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }
      return this.followService.getFollowSuggestions(command.userId, command.limit);
   }
}
