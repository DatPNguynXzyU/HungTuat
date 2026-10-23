export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';
export const LOG_ACTION_KEY = 'log_action';

export const SENSITIVE_LOG_KEYS = [
   'password',
   'currentPassword',
   'newPassword',
   'confirmPassword',
   'token',
   'refreshToken',
   'accessToken',
   'secret',
   'apiKey',
   'creditCard',
   'cardNumber',
   'cvv',
   'cvc',
   'pin',
   'otp',
] as const;

export const SENSITIVE_HEADER_KEYS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-refresh-token'] as const;

export const DEFAULT_LOG_CENSOR = '***REDACTED***';

/**
 * Builds comprehensive Pino fast-redact paths targeting headers, root fields,
 * request body, query params, and nested structures up to depth 3.
 */
export function buildPinoRedactPaths(
   additionalKeys: readonly string[] = [],
   additionalHeaders: readonly string[] = [],
): string[] {
   const headers = [...SENSITIVE_HEADER_KEYS, ...additionalHeaders];
   const keys = [...SENSITIVE_LOG_KEYS, ...additionalKeys];

   const paths: string[] = [];

   for (const header of headers) {
      paths.push(`req.headers.${header}`, `req.headers["${header}"]`, `headers.${header}`, `headers["${header}"]`);
   }

   for (const key of keys) {
      paths.push(
         `req.body.${key}`,
         `req.body.*.${key}`,
         `req.body.*.*.${key}`,
         `req.query.${key}`,
         `req.params.${key}`,
         `*.${key}`,
         `*.*.${key}`,
         `*.*.*.${key}`,
      );
   }

   return Array.from(new Set(paths));
}

export const DEFAULT_REDACT_PATHS = buildPinoRedactPaths();

export const DEFAULT_PINO_REDACT_OPTIONS = {
   paths: DEFAULT_REDACT_PATHS,
   censor: DEFAULT_LOG_CENSOR,
} as const;
