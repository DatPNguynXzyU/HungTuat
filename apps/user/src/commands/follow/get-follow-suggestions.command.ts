import { Command } from '@common';
import type { UserSuggestionItemDto } from '@contracts/user';

export class GetFollowSuggestionsCommand extends Command<UserSuggestionItemDto[]> {
   constructor(
      public readonly userId: string,
      public readonly limit?: number,
   ) {
      super();
   }
}
