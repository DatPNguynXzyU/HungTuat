export interface ISecurityAuditLog {
   id: string;
   userId?: string | null;
   actorEmail?: string | null;
   action: string;
   status: string;
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

export interface ICreateAuditLog {
   userId?: string | null;
   actorEmail?: string | null;
   action: string;
   status?: string;
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
}

export interface IAuditLogQuery {
   userId?: string;
   actorEmail?: string;
   action?: string;
   status?: string;
   startDate?: string;
   endDate?: string;
   page?: number;
   limit?: number;
}

export interface IAuditLogListResult {
   data: ISecurityAuditLog[];
   total: number;
   page: number;
   limit: number;
   totalPages: number;
}
