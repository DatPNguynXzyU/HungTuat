import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@auth/prisma/prisma.service';
import { SessionRepository } from '@auth/repositories/session.repository';

describe('SessionRepository', () => {
   let repository: SessionRepository;

   const sampleSession = {
      id: 'session-id-1',
      userId: 'user-id-1',
      refreshTokenJti: 'jti-1',
      deviceType: 'desktop',
      deviceName: 'Chrome on macOS',
      browser: 'Chrome 122.0',
      os: 'macOS 14.3',
      userAgent: 'Mozilla/5.0...',
      ipAddress: '127.0.0.1',
      city: 'Ho Chi Minh City',
      region: 'SG',
      country: 'Vietnam',
      countryCode: 'VN',
      isRevoked: false,
      lastActiveAt: new Date('2026-09-28T00:00:00.000Z'),
      expiresAt: new Date('2026-10-05T00:00:00.000Z'),
      createdAt: new Date('2026-09-28T00:00:00.000Z'),
      updatedAt: new Date('2026-09-28T00:00:00.000Z'),
   };

   const mockUserSessionCreate = jest.fn();
   const mockUserSessionFindUnique = jest.fn();
   const mockUserSessionFindFirst = jest.fn();
   const mockUserSessionFindMany = jest.fn();
   const mockUserSessionUpdate = jest.fn();
   const mockUserSessionUpdateMany = jest.fn();
   const mockUserSessionDelete = jest.fn();

   const mockPrismaService = {
      userSession: {
         create: mockUserSessionCreate,
         findUnique: mockUserSessionFindUnique,
         findFirst: mockUserSessionFindFirst,
         findMany: mockUserSessionFindMany,
         update: mockUserSessionUpdate,
         updateMany: mockUserSessionUpdateMany,
         delete: mockUserSessionDelete,
      },
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            SessionRepository,
            {
               provide: PrismaService,
               useValue: mockPrismaService,
            },
         ],
      }).compile();

      repository = module.get<SessionRepository>(SessionRepository);
   });

   it('should create a new session entity', async () => {
      mockUserSessionCreate.mockResolvedValue(sampleSession);

      const result = await repository.createSession({
         userId: 'user-id-1',
         refreshTokenJti: 'jti-1',
         deviceType: 'desktop',
         deviceName: 'Chrome on macOS',
         expiresAt: '2026-10-05T00:00:00.000Z',
      });

      expect(result.id).toBe('session-id-1');
      expect(result.userId).toBe('user-id-1');
      expect(mockUserSessionCreate).toHaveBeenCalled();
   });

   it('should find session by ID', async () => {
      mockUserSessionFindUnique.mockResolvedValue(sampleSession);

      const result = await repository.findById('session-id-1');

      expect(result?.id).toBe('session-id-1');
      expect(mockUserSessionFindUnique).toHaveBeenCalledWith({
         where: { id: 'session-id-1' },
      });
   });

   it('should find active sessions by userId', async () => {
      mockUserSessionFindMany.mockResolvedValue([sampleSession]);

      const result = await repository.findActiveSessionsByUserId('user-id-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-id-1');
      expect(mockUserSessionFindMany).toHaveBeenCalledTimes(1);
      const findArgs = mockUserSessionFindMany.mock.calls[0] as [{ where?: { userId?: string; isRevoked?: boolean } }];
      expect(findArgs[0]?.where?.userId).toBe('user-id-1');
      expect(findArgs[0]?.where?.isRevoked).toBe(false);
   });

   it('should revoke a session by id and userId', async () => {
      mockUserSessionFindFirst.mockResolvedValue(sampleSession);
      mockUserSessionUpdate.mockResolvedValue({ ...sampleSession, isRevoked: true });

      const result = await repository.revokeSession('session-id-1', 'user-id-1');

      expect(result?.isRevoked).toBe(true);
      expect(mockUserSessionUpdate).toHaveBeenCalledWith({
         where: { id: 'session-id-1' },
         data: { isRevoked: true },
      });
   });

   it('should revoke all other sessions and return revoked JTIs', async () => {
      mockUserSessionFindMany.mockResolvedValue([
         { refreshTokenJti: 'jti-other-1' },
         { refreshTokenJti: 'jti-other-2' },
      ]);
      mockUserSessionUpdateMany.mockResolvedValue({ count: 2 });

      const jtis = await repository.revokeOtherSessions('user-id-1', 'current-jti');

      expect(jtis).toEqual(['jti-other-1', 'jti-other-2']);
      expect(mockUserSessionUpdateMany).toHaveBeenCalledWith({
         where: {
            userId: 'user-id-1',
            refreshTokenJti: { not: 'current-jti' },
            isRevoked: false,
         },
         data: { isRevoked: true },
      });
   });

   it('should revoke all sessions for a user', async () => {
      mockUserSessionFindMany.mockResolvedValue([{ refreshTokenJti: 'jti-1' }]);
      mockUserSessionUpdateMany.mockResolvedValue({ count: 1 });

      const jtis = await repository.revokeAllSessions('user-id-1');

      expect(jtis).toEqual(['jti-1']);
      expect(mockUserSessionUpdateMany).toHaveBeenCalledWith({
         where: {
            userId: 'user-id-1',
            isRevoked: false,
         },
         data: { isRevoked: true },
      });
   });
});
