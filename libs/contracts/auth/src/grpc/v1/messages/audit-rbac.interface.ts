import type { ISecurityAuditLogProto } from '../models/auth-audit-log.interface';

export interface IGetUserAuditLogsRequest {
   userId: string;
   page?: number;
   limit?: number;
}

export interface IQueryAuditLogsRequest {
   page?: number;
   limit?: number;
   accountId?: string;
   actorEmail?: string;
   action?: string;
   status?: string;
   startDate?: string;
   endDate?: string;
   requestingUserId?: string;
   requestingRoles?: string[];
   requestingPermissions?: string[];
}

export interface IAuditLogListResponse {
   items: ISecurityAuditLogProto[];
   total: number;
   page: number;
   limit: number;
   totalPages: number;
}

export interface IGetAuditLogByIdRequest {
   auditLogId: string;
   requestingUserId?: string;
   requestingRoles?: string[];
   requestingPermissions?: string[];
}

export interface IGetAuditLogByIdResponse {
   auditLog?: ISecurityAuditLogProto;
}

export type IGetJwksRequest = Record<string, never>;

export interface IGetJwksResponse {
   keysJson: string;
}

export interface IGetEmailRequest {
   accountId: string;
}

export interface IGetEmailResponse {
   accountId: string;
   email: string;
}

export interface IGetRolePermissionsRequest {
   roleCode: string;
}

export interface IGetRolePermissionsResponse {
   permissions: string[];
}
