import { UserEntity, UserProfileEntity, UserStatus } from '@user/entities';

describe('UserEntity & UserProfileEntity', () => {
   it('should not contain dateOfBirth and gender on UserProfileEntity', () => {
      const profile = new UserProfileEntity({
         id: 'p1',
         userId: 'u1',
         displayName: 'John Doe',
         dateOfBirth: new Date('1990-01-01'),
         gender: 'MALE',
         createdAt: new Date(),
         updatedAt: new Date(),
      });

      expect(profile.id).toBe('p1');
      expect(profile.displayName).toBe('John Doe');
      expect((profile as unknown as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((profile as unknown as Record<string, unknown>).gender).toBeUndefined();
   });

   it('should not contain dateOfBirth and gender on UserEntity instance', () => {
      const user = new UserEntity({
         id: 'u1',
         accountId: 'a1',
         status: UserStatus.ACTIVE,
         createdAt: new Date(),
         updatedAt: new Date(),
         profile: {
            id: 'p1',
            userId: 'u1',
            displayName: 'John Doe',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'MALE',
            createdAt: new Date(),
            updatedAt: new Date(),
         },
      });

      expect(user.id).toBe('u1');
      expect((user as unknown as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((user as unknown as Record<string, unknown>).gender).toBeUndefined();
      expect((user.profile as unknown as Record<string, unknown>)?.dateOfBirth).toBeUndefined();
      expect((user.profile as unknown as Record<string, unknown>)?.gender).toBeUndefined();
   });
});
