import {
   buildPinoRedactPaths,
   DEFAULT_PINO_REDACT_OPTIONS,
   DEFAULT_REDACT_PATHS,
   SENSITIVE_HEADER_KEYS,
   SENSITIVE_LOG_KEYS,
} from './logger.constants';

describe('Logger Constants & Redaction', () => {
   describe('buildPinoRedactPaths', () => {
      it('should generate wildcard and deep paths for all sensitive keys', () => {
         const paths = buildPinoRedactPaths();

         for (const key of SENSITIVE_LOG_KEYS) {
            expect(paths).toContain(`req.body.${key}`);
            expect(paths).toContain(`req.body.*.${key}`);
            expect(paths).toContain(`req.body.*.*.${key}`);
            expect(paths).toContain(`req.query.${key}`);
            expect(paths).toContain(`req.params.${key}`);
            expect(paths).toContain(`*.${key}`);
            expect(paths).toContain(`*.*.${key}`);
            expect(paths).toContain(`*.*.*.${key}`);
         }
      });

      it('should generate paths for all sensitive headers', () => {
         const paths = buildPinoRedactPaths();

         for (const header of SENSITIVE_HEADER_KEYS) {
            expect(paths).toContain(`req.headers.${header}`);
            expect(paths).toContain(`headers.${header}`);
         }
      });

      it('should support additional keys and headers without duplicates', () => {
         const paths = buildPinoRedactPaths(['customSecret'], ['x-custom-auth']);

         expect(paths).toContain('*.customSecret');
         expect(paths).toContain('req.body.customSecret');
         expect(paths).toContain('req.headers.x-custom-auth');

         const uniqueSet = new Set(paths);
         expect(paths.length).toBe(uniqueSet.size);
      });
   });

   describe('DEFAULT_PINO_REDACT_OPTIONS', () => {
      it('should have DEFAULT_REDACT_PATHS and censor value', () => {
         expect(DEFAULT_PINO_REDACT_OPTIONS.paths).toBe(DEFAULT_REDACT_PATHS);
         expect(DEFAULT_PINO_REDACT_OPTIONS.censor).toBe('***REDACTED***');
      });
   });
});
