export const AUTH_DOMAIN_EVENTS = {
   USER_REGISTERED: 'user.registered',
   ACCOUNT_LOCKED: 'account.locked',
   PASSWORD_CHANGED: 'password.changed',
   SESSION_REVOKED: 'session.revoked',
   LOGIN_SUCCESS: 'auth.login.success',
   LOGIN_FAILED: 'auth.login.failed',
} as const;

export type AuthDomainEvent = (typeof AUTH_DOMAIN_EVENTS)[keyof typeof AUTH_DOMAIN_EVENTS];
