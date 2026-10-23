export const AUTH_PERMISSIONS = {
   // User & Auth Management
   USERS_READ: 'USERS:READ',
   USERS_CREATE: 'USERS:CREATE',
   USERS_UPDATE: 'USERS:UPDATE',
   USERS_DELETE: 'USERS:DELETE',
   USERS_BAN: 'USERS:BAN',

   // RBAC Management
   ROLES_READ: 'ROLES:READ',
   ROLES_CREATE: 'ROLES:CREATE',
   ROLES_UPDATE: 'ROLES:UPDATE',
   ROLES_DELETE: 'ROLES:DELETE',
   PERMISSIONS_READ: 'PERMISSIONS:READ',

   // Security Audit Logs (SOC 2, ISO 27001, GDPR)
   AUDIT_LOGS_READ: 'AUDIT_LOGS:READ',
} as const;

export type AuthPermissionCode = (typeof AUTH_PERMISSIONS)[keyof typeof AUTH_PERMISSIONS];

export const AUTH_PERMISSION_DEFINITIONS: Array<{ code: string; name: string; description: string }> = [
   { code: AUTH_PERMISSIONS.USERS_READ, name: 'Read Users', description: 'View user profiles and account details' },
   { code: AUTH_PERMISSIONS.USERS_CREATE, name: 'Create Users', description: 'Create new user accounts directly' },
   { code: AUTH_PERMISSIONS.USERS_UPDATE, name: 'Update Users', description: 'Update user profiles and statuses' },
   { code: AUTH_PERMISSIONS.USERS_DELETE, name: 'Delete Users', description: 'Delete user accounts' },
   { code: AUTH_PERMISSIONS.USERS_BAN, name: 'Ban Users', description: 'Ban or suspend user accounts' },
   { code: AUTH_PERMISSIONS.ROLES_READ, name: 'Read Roles', description: 'View system roles and assignments' },
   { code: AUTH_PERMISSIONS.ROLES_CREATE, name: 'Create Roles', description: 'Create new system roles' },
   { code: AUTH_PERMISSIONS.ROLES_UPDATE, name: 'Update Roles', description: 'Update existing role definitions' },
   { code: AUTH_PERMISSIONS.ROLES_DELETE, name: 'Delete Roles', description: 'Delete system roles' },
   {
      code: AUTH_PERMISSIONS.PERMISSIONS_READ,
      name: 'Read Permissions',
      description: 'View system permission catalogue',
   },
   {
      code: AUTH_PERMISSIONS.AUDIT_LOGS_READ,
      name: 'Read Audit Logs',
      description: 'View security and compliance audit logs',
   },
];
