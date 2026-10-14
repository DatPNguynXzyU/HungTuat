import { Injectable } from '@nestjs/common';
import { REDIS_TTL, RedisService, uuidv7 } from '@common';
import { AuthRedisKeys } from '@auth/constants';
import type { IVerificationTokenService } from './token.service.interface';

export const VERIFICATION_TOKEN_PREFIX = 'vtok_';

@Injectable()
export class VerificationTokenService implements IVerificationTokenService {
   constructor(private readonly redisService: RedisService) {}

   /**
    * Generate a single-use verification token for OTP flow
    * @param email - User email to associate with the token
    * @param ttl - Time-to-live in seconds (defaults to OTP_VERIFICATION_TOKEN TTL)
    * @returns Verification token string with prefix
    */
   async generate(email: string, ttl: number = REDIS_TTL.OTP_VERIFICATION_TOKEN): Promise<string> {
      const verificationToken = `${VERIFICATION_TOKEN_PREFIX}${uuidv7().replace(/-/g, '')}`;
      const tokenKey = AuthRedisKeys.verificationToken(verificationToken);

      await this.redisService.set(tokenKey, email, ttl);

      return verificationToken;
   }

   /**
    * Validate a verification token and return associated email
    * @param token - Verification token to validate
    * @returns Email if valid, null if not found or expired
    */
   async validate(token: string): Promise<string | null> {
      const tokenKey = AuthRedisKeys.verificationToken(token);
      return await this.redisService.get(tokenKey);
   }

   /**
    * Consume a verification token (validate and delete)
    * @param token - Verification token to consume
    * @returns Email if valid, null if not found or expired
    */
   async consume(token: string): Promise<string | null> {
      const tokenKey = AuthRedisKeys.verificationToken(token);
      const email = await this.redisService.get(tokenKey);
      if (email) {
         await this.redisService.del(tokenKey);
      }
      return email;
   }

   async generateVerificationToken(email: string, ttl?: number): Promise<string> {
      return this.generate(email, ttl);
   }

   async validateVerificationToken(token: string): Promise<string | null> {
      return this.validate(token);
   }

   async consumeVerificationToken(token: string): Promise<string | null> {
      return this.consume(token);
   }
}
