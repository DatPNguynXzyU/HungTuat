import { REDIS_KEY_PREFIX } from '@common';
import { AuthRedisKeys, AUTH_BLOOM_FILTERS } from './auth-redis-keys.constant';

describe('AuthRedisKeys', () => {
   it('should generate refresh token keys and patterns', () => {
      expect(AuthRedisKeys.refreshToken('acc-1', 'jti-123')).toBe(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}acc-1:jti-123`);
      expect(AuthRedisKeys.refreshTokenPattern('acc-1')).toBe(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}acc-1:*`);
   });

   it('should generate session and revocation keys', () => {
      expect(AuthRedisKeys.sessions('acc-1')).toBe(`${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}acc-1`);
      expect(AuthRedisKeys.revokedToken('jti-123')).toBe(`${REDIS_KEY_PREFIX.REVOKED_TOKEN}jti-123`);
      expect(AuthRedisKeys.accountRevokedAt('acc-1')).toBe(`${REDIS_KEY_PREFIX.ACCOUNT_REVOKED_AT}acc-1`);
   });

   it('should generate lockout and failed attempts keys', () => {
      expect(AuthRedisKeys.lockout('test@example.com', '127.0.0.1')).toBe(
         `${REDIS_KEY_PREFIX.LOCKOUT}test@example.com:127.0.0.1`,
      );
      expect(AuthRedisKeys.failedAttempts('test@example.com', '127.0.0.1')).toBe(
         `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}test@example.com:127.0.0.1`,
      );
   });

   it('should generate register OTP keys', () => {
      expect(AuthRedisKeys.registerOtp('test@example.com')).toBe(`${REDIS_KEY_PREFIX.OTP_REGISTER}test@example.com`);
      expect(AuthRedisKeys.registerOtpAttempts('test@example.com')).toBe(
         `${REDIS_KEY_PREFIX.OTP_REGISTER_ATTEMPTS}test@example.com`,
      );
      expect(AuthRedisKeys.registerOtpCooldown('test@example.com')).toBe(
         `${REDIS_KEY_PREFIX.OTP_REGISTER_COOLDOWN}test@example.com`,
      );
   });

   it('should generate change password OTP keys', () => {
      expect(AuthRedisKeys.changePasswordOtp('test@example.com')).toBe(
         `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}test@example.com`,
      );
      expect(AuthRedisKeys.changePasswordOtpAttempts('test@example.com')).toBe(
         `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_ATTEMPTS}test@example.com`,
      );
      expect(AuthRedisKeys.changePasswordOtpCooldown('test@example.com')).toBe(
         `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_COOLDOWN}test@example.com`,
      );
   });

   it('should generate verification token key', () => {
      expect(AuthRedisKeys.verificationToken('tok-123')).toBe(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}tok-123`);
   });

   it('should generate bloom filter keys', () => {
      expect(AuthRedisKeys.bloomEmailInitialized()).toBe(
         `${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}${AUTH_BLOOM_FILTERS.EMAIL}`,
      );
      expect(AuthRedisKeys.bloomInitialized()).toBe(`${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}email`);
      expect(AuthRedisKeys.bloomInitialized('custom')).toBe(`${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}custom`);
      expect(AuthRedisKeys.bloomEmail()).toBe(REDIS_KEY_PREFIX.BLOOM_EMAIL);
   });

   it('should generate threat detection metrics keys', () => {
      expect(AuthRedisKeys.threatMetrics('2026-10-14')).toBe(`${REDIS_KEY_PREFIX.THREAT_METRICS}2026-10-14`);
      expect(AuthRedisKeys.threatIps('2026-10-14')).toBe(`${REDIS_KEY_PREFIX.THREAT_IPS}2026-10-14`);
      expect(AuthRedisKeys.threatReasons('2026-10-14')).toBe(`${REDIS_KEY_PREFIX.THREAT_REASONS}2026-10-14`);
   });
});
