import type { AuditStatus } from '@auth/prisma-client';

export interface SecurityAuditLogEntity {
   id: string;
   userId?: string | null;
   actorEmail?: string | null;
   action: string;
   status: AuditStatus;
   ipAddress?: string | null;
   userAgent?: string | null;
   deviceType?: string | null;
   deviceName?: string | null;
   browser?: string | null;
   os?: string | null;
   city?: string | null;
   country?: string | null;
   reason?: string | null;
   metadata?: Record<string, unknown> | null;
   createdAt: string;
}

export type CreateAuditLogData = Omit<SecurityAuditLogEntity, 'id' | 'createdAt' | 'status'> & {
   id?: string;
   status?: AuditStatus;
   createdAt?: string;
};
