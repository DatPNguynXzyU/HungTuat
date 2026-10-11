import { plainToInstance } from 'class-transformer';
import { UserProfileDto, UserResponseDto } from '@common/dto/user/user-response.dto';

describe('UserResponseDto & UserProfileDto', () => {
   it('should instantiate UserResponseDto and verify profile does not have dateOfBirth or gender', () => {
      const raw = {
         id: '018dc3bc-11a2-7f28-9842-bc08684d0001',
         accountId: '018dc3bc-11a2-7f28-9842-bc08684d0001',
         username: 'john_doe',
         status: 'ACTIVE',
         createdAt: '2026-01-01T00:00:00.000Z',
         updatedAt: '2026-01-02T00:00:00.000Z',
         profile: {
            id: '018dc3bc-11a2-7f28-9842-bc08684d0002',
            userId: '018dc3bc-11a2-7f28-9842-bc08684d0001',
            displayName: 'Johnathan Doe',
            bio: 'Software engineer',
            avatar: 'https://example.com/avatar.jpg',
            coverImage: 'https://example.com/cover.jpg',
            website: 'https://example.com',
            location: 'San Francisco, CA',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
         },
         displayName: 'Johnathan Doe',
      };

      const dto = plainToInstance(UserResponseDto, raw);
      expect(dto).toBeDefined();
      expect(dto.id).toBe(raw.id);
      expect(dto.profile).toBeDefined();
      expect(dto.profile?.displayName).toBe('Johnathan Doe');
      expect((dto.profile as unknown as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((dto.profile as unknown as Record<string, unknown>).gender).toBeUndefined();
   });

   it('should instantiate UserProfileDto without dateOfBirth and gender', () => {
      const profile = new UserProfileDto();
      profile.id = '018dc3bc-11a2-7f28-9842-bc08684d0002';
      profile.userId = '018dc3bc-11a2-7f28-9842-bc08684d0001';
      profile.displayName = 'Johnathan Doe';
      profile.createdAt = '2026-01-01T00:00:00.000Z';
      profile.updatedAt = '2026-01-02T00:00:00.000Z';

      expect(profile.id).toBe('018dc3bc-11a2-7f28-9842-bc08684d0002');
      expect((profile as unknown as Record<string, unknown>).dateOfBirth).toBeUndefined();
      expect((profile as unknown as Record<string, unknown>).gender).toBeUndefined();
   });
});
