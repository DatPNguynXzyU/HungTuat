import { Test, type TestingModule } from '@nestjs/testing';
import { DEFAULT_DEV_RSA_PRIVATE_KEY, type JwtPayload } from '@common';
import { DEFAULT_DEV_RSA_PUBLIC_KEY, DEFAULT_JWT_KEY_ID, JWT_TOKEN_TYPE } from '@contracts/auth';
import { AuthConfigService } from '@auth/config';
import { JwtService } from '@auth/services/infrastructure/jwt.service';

describe('JwtService', () => {
   let service: JwtService;

   const mockConfigService = {
      jwtPrivateKey: DEFAULT_DEV_RSA_PRIVATE_KEY,
      jwtPublicKey: DEFAULT_DEV_RSA_PUBLIC_KEY,
      jwtKeyId: DEFAULT_JWT_KEY_ID,
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
      it('should expose public and private keys, keyId and expiration times', () => {
         expect(service.publicKey).toBe(DEFAULT_DEV_RSA_PUBLIC_KEY);
         expect(service.privateKey).toBe(DEFAULT_DEV_RSA_PRIVATE_KEY);
         expect(service.keyId).toBe(DEFAULT_JWT_KEY_ID);
         expect(service.accessTokenExpiresIn).toBe(900);
         expect(service.refreshTokenExpiresIn).toBe(604800);
      });
   });

   describe('getJwks', () => {
      it('should return valid JWKS structure with RSA public key', () => {
         const jwks = service.getJwks();
         expect(jwks).toBeDefined();
         expect(Array.isArray(jwks.keys)).toBe(true);
         expect(jwks.keys[0].kty).toBe('RSA');
         expect(jwks.keys[0].kid).toBe(DEFAULT_JWT_KEY_ID);
         expect(jwks.keys[0].alg).toBe('RS256');
         expect(jwks.keys[0].use).toBe('sig');
      });
   });

   describe('sign and verify', () => {
      it('should sign payload and successfully verify it', () => {
         const payload: JwtPayload = {
            sub: 'acc-123',
            email: 'test@example.com',
            tokenType: JWT_TOKEN_TYPE.ACCESS,
            jti: 'jti-abc',
         };

         const token = service.sign(payload);
         expect(token).toBeDefined();
         expect(typeof token).toBe('string');

         const decoded = service.verify(token);
         expect(decoded.sub).toBe('acc-123');
         expect(decoded.email).toBe('test@example.com');
         expect(decoded.tokenType).toBe(JWT_TOKEN_TYPE.ACCESS);
         expect(decoded.jti).toBe('jti-abc');
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
      });

      it('should throw when verifying invalid token', () => {
         expect(() => service.verify('invalid.token.structure')).toThrow();
      });
   });
});
