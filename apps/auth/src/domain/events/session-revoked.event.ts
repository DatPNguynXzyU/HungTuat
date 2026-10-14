import type { IDeviceInfo } from '@common';

export const SESSION_REVOKE_REASONS = {
   USER_ACTION: 'user_action',
   SECURITY: 'security',
   EXPIRED: 'expired',
} as const;

export type SessionRevokeReason = (typeof SESSION_REVOKE_REASONS)[keyof typeof SESSION_REVOKE_REASONS];

export class SessionRevokedEvent {
   constructor(
      public readonly accountId: string,
      public readonly sessionId: string,
      public readonly reason: SessionRevokeReason,
      public readonly revokedAt: Date,
      public readonly deviceInfo?: IDeviceInfo,
   ) {}
}
