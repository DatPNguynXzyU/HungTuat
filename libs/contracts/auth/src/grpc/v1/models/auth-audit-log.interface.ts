export interface ISecurityAuditLogProto {
   auditLogId: string;
   userId?: string;
   accountId?: string;
   actorEmail?: string;
   action: string;
   status: string;
   ipAddress?: string;
   userAgent?: string;
   deviceType?: string;
   deviceName?: string;
   browser?: string;
   os?: string;
   city?: string;
   country?: string;
   reason?: string;
   metadataJson?: string;
   createdAt: string;
}
