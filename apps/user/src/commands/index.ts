import { USER_PROFILE_COMMAND_HANDLERS } from '@user/commands/profile';
import { USER_FOLLOW_COMMAND_HANDLERS } from '@user/commands/follow';
import { USER_SEARCH_COMMAND_HANDLERS } from '@user/commands/search';
import { USER_AUTH_COMMAND_HANDLERS } from '@user/commands/authentication';

export * from '@user/commands/profile';
export * from '@user/commands/follow';
export * from '@user/commands/search';
export * from '@user/commands/authentication';

export const USER_COMMAND_HANDLERS = [
   ...USER_PROFILE_COMMAND_HANDLERS,
   ...USER_FOLLOW_COMMAND_HANDLERS,
   ...USER_SEARCH_COMMAND_HANDLERS,
   ...USER_AUTH_COMMAND_HANDLERS,
];

export * from '@user/commands/user-commands.module';
