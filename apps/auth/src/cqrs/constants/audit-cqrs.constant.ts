export const AUDIT_CQRS_EVENTS = {
   EVENT_APPENDED: 'audit.event.appended',
} as const;

export const AUDIT_EVENT_STORE = 'AUDIT_EVENT_STORE';
export const SECURITY_AUDIT_LOG_PROJECTION = 'SECURITY_AUDIT_LOG_PROJECTION';
export const ACCOUNT_SECURITY_SCORE_PROJECTION = 'ACCOUNT_SECURITY_SCORE_PROJECTION';
export const THREAT_DETECTION_PROJECTION = 'THREAT_DETECTION_PROJECTION';
export const AUDIT_PROJECTION_REBUILD_SERVICE = 'AUDIT_PROJECTION_REBUILD_SERVICE';

export { THREAT_METRICS_FIELDS, type ThreatMetricsField } from '@auth/constants/auth-redis-keys.constant';
export { SECURITY_RISK_LEVELS, type SecurityRiskLevel } from '@contracts/auth';
