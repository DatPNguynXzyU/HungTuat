import type { IDeviceInfo, IJwksResponse, IRevokeSessionResult, IUserSessionInfo, JwtPayload } from '@common';
import type { TokenPair } from './token.service';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface ITokenService {
   /**
    * Get JSON Web Key Set (JWKS) for public key verification
    */
   getJwks(): IJwksResponse;

   /**
    * Generate a single-use verification token for OTP flow
    * @param email - User email to associate with the token
    * @param ttl - Time-to-live in seconds (defaults to OTP_VERIFICATION_TOKEN TTL)
    * @returns Verification token string with prefix
    */
   generateVerificationToken(email: string, ttl?: number): Promise<string>;

   /**
    * Validate a verification token and return associated email
    * @param token - Verification token to validate
    * @returns Email if valid, null if not found or expired
    */
   validateVerificationToken(token: string): Promise<string | null>;

   /**
    * Consume a verification token (validate and delete)
    * @param token - Verification token to consume
    * @returns Email if valid, null if not found or expired
    */
   consumeVerificationToken(token: string): Promise<string | null>;

   /**
    * Generate a new access and refresh token pair
    * @param account - Account payload for token generation
    * @param deviceInfo - Optional device information
    * @returns Token pair with access and refresh tokens
    */
   generateTokenPair(account: ITokenAccountPayload, deviceInfo?: IDeviceInfo): Promise<TokenPair>;

   /**
    * Rotate an existing token pair (refresh token flow)
    * @param account - Account payload for token generation
    * @param oldRefreshTokenJti - JTI of the old refresh token to invalidate
    * @param deviceInfo - Optional device information
    * @param remainingTtl - Optional remaining TTL for the old token
    * @returns New token pair with access and refresh tokens
    */
   rotateTokenPair(
      account: ITokenAccountPayload,
      oldRefreshTokenJti: string,
      deviceInfo?: IDeviceInfo,
      remainingTtl?: number,
   ): Promise<TokenPair>;

   /**
    * Validate an access token
    * @param token - Access token to validate
    * @returns Decoded JWT payload if valid
    * @throws UnauthorizedException if token is invalid, expired, or revoked
    */
   validateAccessToken(token: string): Promise<JwtPayload>;

   /**
    * Validate a refresh token
    * @param token - Refresh token to validate
    * @returns Decoded JWT payload if valid
    * @throws UnauthorizedException if token is invalid, expired, or revoked
    */
   validateRefreshToken(token: string): Promise<JwtPayload>;

   /**
    * Check if a token JTI is revoked
    * @param jti - JWT ID to check
    * @returns True if revoked, false otherwise
    */
   isTokenRevoked(jti: string): Promise<boolean>;

   /**
    * Invalidate a specific refresh token
    * @param accountId - Account ID
    * @param jti - JWT ID to invalidate
    * @param remainingTtl - Optional remaining TTL
    */
   invalidateRefreshToken(accountId: string, jti: string, remainingTtl?: number): Promise<void>;

   /**
    * Revoke all active tokens for an account
    * @param accountId - Account ID
    */
   revokeAllAccountTokens(accountId: string): Promise<void>;

   /**
    * Logout all sessions for an account (alias for revokeAllAccountTokens)
    * @param accountId - Account ID
    */
   logoutAll(accountId: string): Promise<void>;

   /**
    * Get all active sessions for an account
    * @param accountId - Account ID
    * @param currentJti - Optional current session JTI to mark as current
    * @returns Array of active session information
    */
   getActiveSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]>;

   /**
    * Revoke a specific session
    * @param accountId - Account ID
    * @param sessionId - Session ID to revoke
    * @throws NotFoundException if session not found
    */
   revokeSession(accountId: string, sessionId: string): Promise<void>;

   /**
    * Revoke all sessions except the current one
    * @param accountId - Account ID
    * @param currentJti - Current session JTI to keep active
    * @returns Result with count of revoked sessions
    */
   revokeOtherSessions(accountId: string, currentJti: string): Promise<IRevokeSessionResult>;

   /**
    * Revoke a specific token
    * @param token - Token to revoke
    * @throws UnauthorizedException if token is invalid
    */
   revokeToken(token: string): Promise<void>;
}

export interface ITokenAccountPayload {
   id: string;
   email: string;
   roles: string[];
}
