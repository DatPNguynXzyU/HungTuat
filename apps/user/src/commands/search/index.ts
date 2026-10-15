export * from '@user/commands/search/search-users.command';
export * from '@user/commands/search/search-users.handler';

import { SearchUsersHandler } from '@user/commands/search/search-users.handler';

export const USER_SEARCH_COMMAND_HANDLERS = [SearchUsersHandler];
