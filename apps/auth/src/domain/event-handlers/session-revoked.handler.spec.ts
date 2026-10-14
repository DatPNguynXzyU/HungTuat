import { Test, TestingModule } from '@nestjs/testing';
import { SessionRevokedEventHandler } from './session-revoked.handler';
import { SESSION_REVOKE_REASONS, SessionRevokedEvent } from '@auth/domain/events';

describe('SessionRevokedEventHandler', () => {
   let handler: SessionRevokedEventHandler;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [SessionRevokedEventHandler],
      }).compile();

      handler = module.get<SessionRevokedEventHandler>(SessionRevokedEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should handle session revoked event without throwing', () => {
      const event = new SessionRevokedEvent(
         'acc-123',
         'sess-456',
         SESSION_REVOKE_REASONS.USER_ACTION,
         new Date('2026-01-01T12:00:00.000Z'),
         { ipAddress: '127.0.0.1' },
      );

      expect(() => handler.handle(event)).not.toThrow();
   });
});
