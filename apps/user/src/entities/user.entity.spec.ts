import { Gender, UserEntity, UserProfileEntity, UserStatus } from '@user/entities';

describe('UserEntity & UserProfileEntity', () => {
   it('should not contain dateOfBirth and gender on UserProfileEntity', () => {
      const profile = new UserProfileEntity({
         profileId: 'p1',
         userId: 'u1',
         displayName: 'John Doe',
         dateOfBirth: new Date('1990-01-01'),
         gender: Gender.MALE,
         createdAt: new Date(),
         updatedAt: new Date(),
      });

      expect(profile.profileId).toBe('p1');
      expect(profile.displayName).toBe('John Doe');
      expect((profile as unknown as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((profile as unknown as Record<string, unknown>).gender).toBeUndefined();
   });

   it('should not contain dateOfBirth and gender on UserEntity instance', () => {
      const user = new UserEntity({
         userId: 'u1',
         accountId: 'a1',
         status: UserStatus.ACTIVE,
         createdAt: new Date(),
         updatedAt: new Date(),
         profile: {
            profileId: 'p1',
            userId: 'u1',
            displayName: 'John Doe',
            dateOfBirth: new Date('1990-01-01'),
            gender: Gender.MALE,
            createdAt: new Date(),
            updatedAt: new Date(),
         },
      });

      expect(user.userId).toBe('u1');
      expect((user as unknown as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((user as unknown as Record<string, unknown>).gender).toBeUndefined();
      expect((user.profile as unknown as Record<string, unknown>)?.dateOfBirth).toBeUndefined();
      expect((user.profile as unknown as Record<string, unknown>)?.gender).toBeUndefined();
   });
});
