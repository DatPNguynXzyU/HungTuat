import { BadRequestException } from '@common';
import { UserEntity, UserStatus } from '@user/core/database/entities';
import type { ProfileService } from '@user/services/domain/profile.service';
import {
   CreateProfileCommand,
   CreateProfileHandler,
   CreateUserCommand,
   CreateUserHandler,
   DeleteUserCommand,
   DeleteUserHandler,
   GetAvatarUploadSignatureCommand,
   GetAvatarUploadSignatureHandler,
   GetDateOfBirthCommand,
   GetDateOfBirthHandler,
   GetUserByAccountIdCommand,
   GetUserByAccountIdHandler,
   GetUserByIdCommand,
   GetUserByIdHandler,
   GetUserByUserIdCommand,
   GetUserByUserIdHandler,
   GetUserByUsernameCommand,
   GetUserByUsernameHandler,
   RestoreUserCommand,
   RestoreUserHandler,
   UpdateUsernameCommand,
   UpdateUsernameHandler,
   UpdateUserProfileCommand,
   UpdateUserProfileHandler,
   UploadAvatarCommand,
   UploadAvatarHandler,
   UpsertUserProfileCommand,
   UpsertUserProfileHandler,
} from '@user/commands/profile';

describe('Profile Command Handlers', () => {
   let profileService: jest.Mocked<Partial<ProfileService>>;

   const mockUser = new UserEntity({
      userId: 'profile-1',
      accountId: 'acc-1',
      username: 'john_doe',
      status: UserStatus.ACTIVE,
      profile: {
         profileId: 'p-1',
         userId: 'profile-1',
         displayName: 'John Doe',
      },
   });

   beforeEach(() => {
      profileService = {
         createUser: jest.fn().mockResolvedValue(mockUser),
         getUserById: jest.fn().mockResolvedValue(mockUser),
         getUserByUserId: jest.fn().mockResolvedValue(mockUser),
         getUserByAccountId: jest.fn().mockResolvedValue(mockUser),
         getUserByUsername: jest.fn().mockResolvedValue(mockUser),
         getDateOfBirth: jest.fn().mockResolvedValue({ userId: 'profile-1', dateOfBirth: new Date(), age: 25 }),
         updateUserProfile: jest.fn().mockResolvedValue(mockUser),
         upsertUserProfile: jest.fn().mockResolvedValue(mockUser),
         updateUsername: jest.fn().mockResolvedValue(mockUser),
         deleteUser: jest.fn().mockResolvedValue(mockUser),
         restoreUser: jest.fn().mockResolvedValue(mockUser),
         uploadAvatar: jest
            .fn()
            .mockResolvedValue({ avatarUrl: 'http://avatar.jpg', publicId: 'pub-1', user: mockUser }),
         getAvatarUploadSignature: jest.fn().mockResolvedValue({ uploadUrl: 'http://upload.url', publicId: 'sig-1' }),
      };
   });

   describe('CreateProfileHandler', () => {
      it('should create profile when accountId is provided', async () => {
         const handler = new CreateProfileHandler(profileService as ProfileService);
         const result = await handler.execute(
            new CreateProfileCommand({
               data: { accountId: 'acc-1', displayName: 'John' },
            }),
         );

         expect(profileService.createUser).toHaveBeenCalledWith(
            expect.objectContaining({ accountId: 'acc-1', displayName: 'John' }),
         );
         expect(result).toEqual(mockUser);
      });

      it('should throw BadRequestException when no accountId is present', async () => {
         const handler = new CreateProfileHandler(profileService as ProfileService);
         await expect(handler.execute(new CreateProfileCommand({ data: {} }))).rejects.toThrow(BadRequestException);
      });
   });

   describe('CreateUserHandler', () => {
      it('should create user', async () => {
         const handler = new CreateUserHandler(profileService as ProfileService);
         const result = await handler.execute(new CreateUserCommand({ accountId: 'acc-1', displayName: 'John' }));

         expect(profileService.createUser).toHaveBeenCalledWith(
            expect.objectContaining({ accountId: 'acc-1', displayName: 'John' }),
         );
         expect(result).toEqual(mockUser);
      });
   });

   describe('GetUserByIdHandler', () => {
      it('should return user by id', async () => {
         const handler = new GetUserByIdHandler(profileService as ProfileService);
         const result = await handler.execute(new GetUserByIdCommand({ data: { userId: 'profile-1' } }));

         expect(profileService.getUserById).toHaveBeenCalledWith('profile-1');
         expect(result).toEqual(mockUser);
      });

      it('should fallback to auto-create user when self id is not found', async () => {
         profileService.getUserById = jest.fn().mockRejectedValueOnce(new Error('Not found'));
         const handler = new GetUserByIdHandler(profileService as ProfileService);

         const result = await handler.execute(
            new GetUserByIdCommand({
               data: { userId: 'acc-1' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.createUser).toHaveBeenCalledWith({ accountId: 'acc-1' });
         expect(result).toEqual(mockUser);
      });
   });

   describe('GetUserByUserIdHandler', () => {
      it('should return user by userId', async () => {
         const handler = new GetUserByUserIdHandler(profileService as ProfileService);
         const result = await handler.execute(new GetUserByUserIdCommand('profile-1'));

         expect(profileService.getUserByUserId).toHaveBeenCalledWith('profile-1');
         expect(result).toEqual(mockUser);
      });
   });

   describe('GetUserByAccountIdHandler', () => {
      it('should return user by accountId', async () => {
         const handler = new GetUserByAccountIdHandler(profileService as ProfileService);
         const result = await handler.execute(new GetUserByAccountIdCommand('acc-1'));

         expect(profileService.getUserByAccountId).toHaveBeenCalledWith('acc-1');
         expect(result).toEqual(mockUser);
      });
   });

   describe('GetUserByUsernameHandler', () => {
      it('should return user by username', async () => {
         const handler = new GetUserByUsernameHandler(profileService as ProfileService);
         const result = await handler.execute(new GetUserByUsernameCommand('john_doe'));

         expect(profileService.getUserByUsername).toHaveBeenCalledWith('john_doe');
         expect(result).toEqual(mockUser);
      });
   });

   describe('GetDateOfBirthHandler', () => {
      it('should return date of birth', async () => {
         const handler = new GetDateOfBirthHandler(profileService as ProfileService);
         const result = await handler.execute(new GetDateOfBirthCommand('profile-1'));

         expect(profileService.getDateOfBirth).toHaveBeenCalledWith('profile-1');
         expect(result.age).toBe(25);
      });

      it('should throw BadRequestException if userId is empty', async () => {
         const handler = new GetDateOfBirthHandler(profileService as ProfileService);
         await expect(handler.execute(new GetDateOfBirthCommand(''))).rejects.toThrow(BadRequestException);
      });
   });

   describe('UpdateUserProfileHandler', () => {
      it('should update profile with ownership verified', async () => {
         const handler = new UpdateUserProfileHandler(profileService as ProfileService);
         const result = await handler.execute(
            new UpdateUserProfileCommand({
               data: { userId: 'profile-1', displayName: 'Updated' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.updateUserProfile).toHaveBeenCalledWith('profile-1', { displayName: 'Updated' });
         expect(result).toEqual(mockUser);
      });
   });

   describe('UpsertUserProfileHandler', () => {
      it('should upsert profile with ownership verified', async () => {
         const handler = new UpsertUserProfileHandler(profileService as ProfileService);
         const result = await handler.execute(
            new UpsertUserProfileCommand({
               data: { userId: 'acc-1', displayName: 'Upserted' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.upsertUserProfile).toHaveBeenCalledWith('acc-1', { displayName: 'Upserted' });
         expect(result).toEqual(mockUser);
      });
   });

   describe('UpdateUsernameHandler', () => {
      it('should update username with ownership check', async () => {
         const handler = new UpdateUsernameHandler(profileService as ProfileService);
         const result = await handler.execute(
            new UpdateUsernameCommand({
               data: { userId: 'profile-1', username: 'new_john' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.updateUsername).toHaveBeenCalledWith('profile-1', 'new_john');
         expect(result).toEqual(mockUser);
      });
   });

   describe('DeleteUserHandler', () => {
      it('should delete user with ownership check', async () => {
         const handler = new DeleteUserHandler(profileService as ProfileService);
         const result = await handler.execute(
            new DeleteUserCommand({
               data: { userId: 'profile-1' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.deleteUser).toHaveBeenCalledWith('profile-1');
         expect(result).toEqual(mockUser);
      });
   });

   describe('RestoreUserHandler', () => {
      it('should restore user', async () => {
         const handler = new RestoreUserHandler(profileService as ProfileService);
         const result = await handler.execute(new RestoreUserCommand('profile-1'));

         expect(profileService.restoreUser).toHaveBeenCalledWith('profile-1');
         expect(result).toEqual(mockUser);
      });
   });

   describe('UploadAvatarHandler', () => {
      it('should upload avatar with ownership check', async () => {
         const handler = new UploadAvatarHandler(profileService as ProfileService);
         const result = await handler.execute(
            new UploadAvatarCommand({
               data: { userId: 'acc-1', fileBase64: 'abc123' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.uploadAvatar).toHaveBeenCalledWith('acc-1', 'abc123', undefined);
         expect(result.avatarUrl).toBe('http://avatar.jpg');
      });
   });

   describe('GetAvatarUploadSignatureHandler', () => {
      it('should get avatar upload signature with ownership check', async () => {
         const handler = new GetAvatarUploadSignatureHandler(profileService as ProfileService);
         const result = await handler.execute(
            new GetAvatarUploadSignatureCommand({
               data: { userId: 'acc-1' },
               user: { userId: 'acc-1', email: 'test@example.com', roles: ['user'], permissions: [] },
            }),
         );

         expect(profileService.getAvatarUploadSignature).toHaveBeenCalledWith('acc-1');
         expect(result).toEqual({ uploadUrl: 'http://upload.url', publicId: 'sig-1' });
      });
   });
});
