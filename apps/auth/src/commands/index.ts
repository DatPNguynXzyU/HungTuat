import {
   CheckEmailHandler,
   RegisterHandler,
   SendRegisterOtpHandler,
   VerifyRegisterOtpHandler,
} from '@auth/commands/registration';
import {
   GetEmailHandler,
   GetJwksHandler,
   GetRolePermissionsHandler,
   LoginHandler,
   LogoutAllHandler,
   RefreshTokenHandler,
   RevokeAllAccountTokensHandler,
   RevokeTokenHandler,
   ValidateTokenHandler,
} from '@auth/commands/auth';
import { GetSessionsHandler, RevokeOtherSessionsHandler, RevokeSessionHandler } from '@auth/commands/session';
import { ChangePasswordHandler, VerifyChangePasswordOtpHandler } from '@auth/commands/password';
import {
   CreateAuditLogHandler,
   GetAccountAuditLogsHandler,
   GetAuditLogByIdHandler,
   GetAuditLogsHandler,
} from '@auth/commands/audit';

export * from '@auth/commands/registration';
export * from '@auth/commands/auth';
export * from '@auth/commands/session';
export * from '@auth/commands/password';
export * from '@auth/commands/audit';

export const AUTH_COMMAND_HANDLERS = [
   // Registration Handlers
   CheckEmailHandler,
   SendRegisterOtpHandler,
   VerifyRegisterOtpHandler,
   RegisterHandler,

   // Auth Handlers
   GetJwksHandler,
   LoginHandler,
   RefreshTokenHandler,
   RevokeTokenHandler,
   RevokeAllAccountTokensHandler,
   LogoutAllHandler,
   ValidateTokenHandler,
   GetRolePermissionsHandler,
   GetEmailHandler,

   // Session Handlers
   GetSessionsHandler,
   RevokeSessionHandler,
   RevokeOtherSessionsHandler,

   // Password Handlers
   ChangePasswordHandler,
   VerifyChangePasswordOtpHandler,

   // Audit Handlers
   GetAuditLogsHandler,
   GetAuditLogByIdHandler,
   GetAccountAuditLogsHandler,
   CreateAuditLogHandler,
];

export * from '@auth/commands/auth-commands.module';
