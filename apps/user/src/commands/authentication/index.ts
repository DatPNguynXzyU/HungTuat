export * from '@user/commands/authentication/check-username.command';
export * from '@user/commands/authentication/check-username.handler';
export * from '@user/commands/authentication/handle-user-registered.command';
export * from '@user/commands/authentication/handle-user-registered.handler';

import { CheckUsernameHandler } from '@user/commands/authentication/check-username.handler';
import { HandleUserRegisteredHandler } from '@user/commands/authentication/handle-user-registered.handler';

export const USER_AUTH_COMMAND_HANDLERS = [CheckUsernameHandler, HandleUserRegisteredHandler];
