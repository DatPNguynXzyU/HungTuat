export const AUTH_DOMAIN_EVENTS = {
   USER_REGISTERED: 'user.registered',
   USER_REGISTRATION_FAILED: 'user.registration.failed',
   SUPPLIER_REGISTERED: 'supplier.registered',
   SUPPLIER_REGISTRATION_FAILED: 'supplier.registration.failed',
   ACCOUNT_LOCKED: 'account.locked',
   PASSWORD_CHANGED: 'password.changed',
   SESSION_REVOKED: 'session.revoked',
   SESSIONS_REVOKED_OTHERS: 'session.revoked_others',
   SESSIONS_REVOKED_ALL: 'session.revoked_all',
   ACTIVE_SESSIONS_COUNTED: 'session.active_counted',
   SESSION_REVOKE_FAILED: 'session.revoke_failed',
   LOGIN_SUCCESS: 'auth.login.success',
   LOGIN_FAILED: 'auth.login.failed',
   OTP_GENERATED: 'auth.otp.generated',
   OTP_VERIFIED: 'auth.otp.verified',
   OTP_FAILED: 'auth.otp.failed',
} as const;

export type AuthDomainEvent = (typeof AUTH_DOMAIN_EVENTS)[keyof typeof AUTH_DOMAIN_EVENTS];
