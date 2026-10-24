import { Test, type TestingModule } from '@nestjs/testing';
import { DEFAULT_DEV_EC_PRIVATE_KEY, JwtUtil, type JwtPayload } from '@common';
import {
   DEFAULT_DEV_EC_PUBLIC_KEY,
   DEFAULT_JWT_ALGORITHM,
   DEFAULT_JWT_AUDIENCE,
   DEFAULT_JWT_ISSUER,
   DEFAULT_JWT_KEY_ID,
   JWT_TOKEN_TYPE,
} from '@contracts/auth';
import { AuthConfigService } from '@auth/config';
import { JwtService } from '@auth/services/infrastructure/jwt.service';

describe('JwtService', () => {
   let service: JwtService;

   const mockConfigService = {
      jwtPrivateKey: DEFAULT_DEV_EC_PRIVATE_KEY,
      jwtPublicKey: DEFAULT_DEV_EC_PUBLIC_KEY,
      jwtKeyId: DEFAULT_JWT_KEY_ID,
      jwtAlgorithm: DEFAULT_JWT_ALGORITHM,
      jwtIssuer: DEFAULT_JWT_ISSUER,
      jwtAudience: DEFAULT_JWT_AUDIENCE,
      jwtAccessTokenExpiresIn: 900,
      jwtRefreshTokenExpiresIn: 604800,
   };

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            JwtService,
            {
               provide: AuthConfigService,
               useValue: mockConfigService,
            },
         ],
      }).compile();

      service = module.get<JwtService>(JwtService);
   });

   describe('configuration getters', () => {
      it('should expose public and private keys, keyId, algorithm, issuer, audience and expiration times', () => {
         expect(service.publicKey).toBe(DEFAULT_DEV_EC_PUBLIC_KEY);
         expect(service.privateKey).toBe(DEFAULT_DEV_EC_PRIVATE_KEY);
         expect(service.keyId).toBe(DEFAULT_JWT_KEY_ID);
         expect(service.algorithm).toBe(DEFAULT_JWT_ALGORITHM);
         expect(service.issuer).toBe(DEFAULT_JWT_ISSUER);
         expect(service.audience).toBe(DEFAULT_JWT_AUDIENCE);
         expect(service.accessTokenExpiresIn).toBe(900);
         expect(service.refreshTokenExpiresIn).toBe(604800);
      });
   });

   describe('getJwks', () => {
      it('should return valid JWKS structure with EC public key (P-256)', () => {
         const jwks = service.getJwks();
         expect(jwks).toBeDefined();
         expect(Array.isArray(jwks.keys)).toBe(true);
         expect(jwks.keys[0].kty).toBe('EC');
         expect(jwks.keys[0].crv).toBe('P-256');
         expect(jwks.keys[0].x).toBeDefined();
         expect(jwks.keys[0].y).toBeDefined();
         expect(jwks.keys[0].kid).toBe(DEFAULT_JWT_KEY_ID);
         expect(jwks.keys[0].alg).toBe(DEFAULT_JWT_ALGORITHM);
         expect(jwks.keys[0].use).toBe('sig');
      });
   });

   describe('sign and verify', () => {
      it('should sign payload and successfully verify it with standard OIDC claims', () => {
         const payload: JwtPayload = {
            sub: 'acc-123',
            email: 'test@example.com',
            tokenType: JWT_TOKEN_TYPE.ACCESS,
            jti: 'jti-abc',
         };

         const token = service.sign(payload);
         expect(token).toBeDefined();
         expect(typeof token).toBe('string');

         const decodedComplete = JwtUtil.decode(token, { complete: true });
         expect(decodedComplete?.header.alg).toBe(DEFAULT_JWT_ALGORITHM);
         expect(decodedComplete?.header.kid).toBe(DEFAULT_JWT_KEY_ID);

         const decoded = service.verify(token);
         expect(decoded.sub).toBe('acc-123');
         expect(decoded.email).toBe('test@example.com');
         expect(decoded.tokenType).toBe(JWT_TOKEN_TYPE.ACCESS);
         expect(decoded.jti).toBe('jti-abc');
         expect(decoded.iss).toBe(DEFAULT_JWT_ISSUER);
         expect(decoded.aud).toBe(DEFAULT_JWT_AUDIENCE);
      });

      it('should respect custom expiresIn parameter and options', () => {
         const payload: JwtPayload = {
            sub: 'acc-456',
            email: 'user@example.com',
         };

         const token = service.sign(payload, 3600);
         const decoded = service.verify(token);
         expect(decoded.sub).toBe('acc-456');
         expect(decoded.exp).toBeDefined();
         expect(decoded.iat).toBeDefined();
         expect(decoded.exp! - decoded.iat!).toBe(3600);
         expect(decoded.iss).toBe(DEFAULT_JWT_ISSUER);
         expect(decoded.aud).toBe(DEFAULT_JWT_AUDIENCE);
      });

      it('should throw when verifying invalid token', () => {
         expect(() => service.verify('invalid.token.structure')).toThrow();
      });
   });
});
