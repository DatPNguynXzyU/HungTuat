import { ConfigService } from '@nestjs/config';
import { CommonConfigService } from '@common/config/common-config.service';
import { type SharedEnvConfig } from '@common/config/shared-env.schema';
import {
   DEFAULT_DEV_EC_PRIVATE_KEY,
   DEFAULT_DEV_EC_PUBLIC_KEY,
   DEFAULT_JWT_AUDIENCE,
   DEFAULT_JWT_ISSUER,
} from '@common/constants/jwt.constant';
import { JwtUtil } from '@common/utils/jwt.util';

describe('CommonConfigService', () => {
   let configService: jest.Mocked<ConfigService<SharedEnvConfig, true>>;
   let service: CommonConfigService;

   beforeEach(() => {
      configService = {
         get: jest.fn(),
      } as unknown as jest.Mocked<ConfigService<SharedEnvConfig, true>>;
      service = new CommonConfigService(configService);
   });

   describe('in-memory key caching (memoization)', () => {
      it('should cache jwtPublicKey in-memory and not re-read from file or config on subsequent calls', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'development';
            if (key === 'JWT_PUBLIC_KEY_PATH') return 'dummy/path/public.key';
            return undefined;
         });

         const readKeyFileSpy = jest.spyOn(JwtUtil, 'readKeyFile').mockReturnValue('mocked-public-key');

         const firstCall = service.jwtPublicKey;
         const secondCall = service.jwtPublicKey;

         expect(firstCall).toBe('mocked-public-key');
         expect(secondCall).toBe('mocked-public-key');
         expect(readKeyFileSpy).toHaveBeenCalledTimes(1);

         readKeyFileSpy.mockRestore();
      });

      it('should cache jwtPrivateKey in-memory and not re-read on subsequent calls', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'development';
            if (key === 'JWT_PRIVATE_KEY_PATH') return 'dummy/path/private.key';
            return undefined;
         });

         const readKeyFileSpy = jest.spyOn(JwtUtil, 'readKeyFile').mockReturnValue('mocked-private-key');

         const firstCall = service.jwtPrivateKey;
         const secondCall = service.jwtPrivateKey;

         expect(firstCall).toBe('mocked-private-key');
         expect(secondCall).toBe('mocked-private-key');
         expect(readKeyFileSpy).toHaveBeenCalledTimes(1);

         readKeyFileSpy.mockRestore();
      });

      it('should invalidate cache when clearKeyCache is invoked', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'development';
            if (key === 'JWT_PUBLIC_KEY_PATH') return 'dummy/path/public.key';
            return undefined;
         });

         const readKeyFileSpy = jest.spyOn(JwtUtil, 'readKeyFile').mockReturnValue('mocked-public-key');

         expect(service.jwtPublicKey).toBe('mocked-public-key');
         expect(readKeyFileSpy).toHaveBeenCalledTimes(1);

         service.clearKeyCache();
         expect(service.jwtPublicKey).toBe('mocked-public-key');
         expect(readKeyFileSpy).toHaveBeenCalledTimes(2);

         readKeyFileSpy.mockRestore();
      });
   });

   describe('production key guard', () => {
      it('should throw fatal error when accessing jwtPublicKey in production without configured key', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'production';
            return undefined;
         });

         expect(() => service.jwtPublicKey).toThrow('FATAL: JWT public key missing in production');
      });

      it('should throw fatal error when accessing jwtPrivateKey in production without configured key', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'production';
            return undefined;
         });

         expect(() => service.jwtPrivateKey).toThrow('FATAL: JWT private key missing in production');
      });

      it('should fallback to dev key in development mode', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'development';
            return undefined;
         });

         expect(service.jwtPublicKey).toBe(DEFAULT_DEV_EC_PUBLIC_KEY);
         expect(service.jwtPrivateKey).toBe(DEFAULT_DEV_EC_PRIVATE_KEY);
      });
   });

   describe('OIDC claims configuration', () => {
      it('should return default jwtIssuer and jwtAudience when not configured', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'NODE_ENV') return 'development';
            return undefined;
         });

         expect(service.jwtIssuer).toBe(DEFAULT_JWT_ISSUER);
         expect(service.jwtAudience).toBe(DEFAULT_JWT_AUDIENCE);
      });

      it('should return configured jwtIssuer and jwtAudience', () => {
         configService.get.mockImplementation((key: string) => {
            if (key === 'JWT_ISSUER') return 'custom-issuer';
            if (key === 'JWT_AUDIENCE') return 'custom-audience';
            return undefined;
         });

         expect(service.jwtIssuer).toBe('custom-issuer');
         expect(service.jwtAudience).toBe('custom-audience');
      });
   });
});
