export * from '@user/commands/profile/create-profile.command';
export * from '@user/commands/profile/create-profile.handler';
export * from '@user/commands/profile/create-user.command';
export * from '@user/commands/profile/create-user.handler';
export * from '@user/commands/profile/get-user-by-id.command';
export * from '@user/commands/profile/get-user-by-id.handler';
export * from '@user/commands/profile/get-user-by-user-id.command';
export * from '@user/commands/profile/get-user-by-user-id.handler';
export * from '@user/commands/profile/get-user-by-account-id.command';
export * from '@user/commands/profile/get-user-by-account-id.handler';
export * from '@user/commands/profile/get-user-by-username.command';
export * from '@user/commands/profile/get-user-by-username.handler';
export * from '@user/commands/profile/get-date-of-birth.command';
export * from '@user/commands/profile/get-date-of-birth.handler';
export * from '@user/commands/profile/update-user-profile.command';
export * from '@user/commands/profile/update-user-profile.handler';
export * from '@user/commands/profile/upsert-user-profile.command';
export * from '@user/commands/profile/upsert-user-profile.handler';
export * from '@user/commands/profile/update-username.command';
export * from '@user/commands/profile/update-username.handler';
export * from '@user/commands/profile/delete-user.command';
export * from '@user/commands/profile/delete-user.handler';
export * from '@user/commands/profile/restore-user.command';
export * from '@user/commands/profile/restore-user.handler';
export * from '@user/commands/profile/upload-avatar.command';
export * from '@user/commands/profile/upload-avatar.handler';
export * from '@user/commands/profile/get-avatar-upload-signature.command';
export * from '@user/commands/profile/get-avatar-upload-signature.handler';

import { CreateProfileHandler } from '@user/commands/profile/create-profile.handler';
import { CreateUserHandler } from '@user/commands/profile/create-user.handler';
import { GetUserByIdHandler } from '@user/commands/profile/get-user-by-id.handler';
import { GetUserByUserIdHandler } from '@user/commands/profile/get-user-by-user-id.handler';
import { GetUserByAccountIdHandler } from '@user/commands/profile/get-user-by-account-id.handler';
import { GetUserByUsernameHandler } from '@user/commands/profile/get-user-by-username.handler';
import { GetDateOfBirthHandler } from '@user/commands/profile/get-date-of-birth.handler';
import { UpdateUserProfileHandler } from '@user/commands/profile/update-user-profile.handler';
import { UpsertUserProfileHandler } from '@user/commands/profile/upsert-user-profile.handler';
import { UpdateUsernameHandler } from '@user/commands/profile/update-username.handler';
import { DeleteUserHandler } from '@user/commands/profile/delete-user.handler';
import { RestoreUserHandler } from '@user/commands/profile/restore-user.handler';
import { UploadAvatarHandler } from '@user/commands/profile/upload-avatar.handler';
import { GetAvatarUploadSignatureHandler } from '@user/commands/profile/get-avatar-upload-signature.handler';

export const USER_PROFILE_COMMAND_HANDLERS = [
   CreateProfileHandler,
   CreateUserHandler,
   GetUserByIdHandler,
   GetUserByUserIdHandler,
   GetUserByAccountIdHandler,
   GetUserByUsernameHandler,
   GetDateOfBirthHandler,
   UpdateUserProfileHandler,
   UpsertUserProfileHandler,
   UpdateUsernameHandler,
   DeleteUserHandler,
   RestoreUserHandler,
   UploadAvatarHandler,
   GetAvatarUploadSignatureHandler,
];
