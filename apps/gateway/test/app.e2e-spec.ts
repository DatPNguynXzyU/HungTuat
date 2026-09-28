import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DEFAULT_DEV_RSA_PRIVATE_KEY, JwtUtil, SERVICES } from '@common';
import { GatewayConfigService } from '@/config';
import { GatewayModule } from '@/gateway.module';
import { App } from 'supertest/types';
import { of } from 'rxjs';

describe('GatewayController (e2e)', () => {
   let app: INestApplication;
   let configService: GatewayConfigService;

   const mockAuthClient = {
      send: jest.fn((pattern: { cmd: string }, data: unknown) => {
         if (pattern.cmd === 'auth.get_jwks') {
            return of({
               keys: [
                  {
                     kty: 'RSA',
                     use: 'sig',
                     alg: 'RS256',
                     kid: 'omni-auth-key-1',
                     n: 'mock_n',
                     e: 'AQAB',
                  },
               ],
            });
         }
         if (pattern.cmd === 'auth.register') {
            const dto = data as { email: string; fullName: string };
            return of({
               user: {
                  id: 'usr_mock_123',
                  email: dto.email,
                  fullName: dto.fullName,
                  createdAt: new Date().toISOString(),
               },
               accessToken: 'mock.access.token',
            });
         }
         if (pattern.cmd === 'auth.login') {
            const dto = data as { email: string };
            return of({
               user: {
                  id: 'usr_mock_123',
                  email: dto.email,
                  fullName: 'Mock User',
                  createdAt: new Date().toISOString(),
               },
               accessToken: 'mock.access.token',
            });
         }
         return of(null);
      }),
   };

   beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [GatewayModule],
      })
         .overrideProvider(SERVICES.AUTH_SERVICE)
         .useValue(mockAuthClient)
         .compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      await app.init();
      configService = app.get(GatewayConfigService);
   });

   afterEach(async () => {
      await app.close();
   });

   it('/health (GET) - public route should be accessible without token', async () => {
      const res = await request(app.getHttpServer() as App)
         .get('/health')
         .expect(200);

      const body = res.body as { status: string };
      expect(body.status).toBe('ok');
   });

   it('/auth/.well-known/jwks.json (GET) - public JWKS endpoint should return key set', async () => {
      const res = await request(app.getHttpServer() as App)
         .get('/auth/.well-known/jwks.json')
         .expect(200);

      const body = res.body as { keys: Array<{ kty: string; alg: string }> };
      expect(body.keys).toBeDefined();
      expect(body.keys.length).toBeGreaterThan(0);
      expect(body.keys[0].kty).toBe('RSA');
      expect(body.keys[0].alg).toBe('RS256');
   });

   it('/auth/jwks.json (GET) - public JWKS alias endpoint should return key set', async () => {
      const res = await request(app.getHttpServer() as App)
         .get('/auth/jwks.json')
         .expect(200);

      const body = res.body as { keys: Array<{ kty: string; alg: string }> };
      expect(body.keys).toBeDefined();
      expect(body.keys.length).toBeGreaterThan(0);
      expect(body.keys[0].kty).toBe('RSA');
   });

   it('/auth/register (POST) - public route should set access_token cookie for auto-login', async () => {
      const res = await request(app.getHttpServer() as App)
         .post('/auth/register')
         .send({
            email: 'john@example.com',
            password: 'password123',
            fullName: 'John Doe',
         })
         .expect(201);

      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes('access_token='))).toBe(true);
      expect(cookies?.some((c) => c.includes('HttpOnly'))).toBe(true);

      const body = res.body as { user: { email: string; fullName: string } };
      expect(body.user.email).toBe('john@example.com');
   });

   it('/auth/logout (POST) - public route should clear access_token cookie', async () => {
      const res = await request(app.getHttpServer() as App)
         .post('/auth/logout')
         .expect(200);

      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes('access_token=;'))).toBe(true);
   });

   it('/auth/me (GET) - protected route should reject without token (401)', async () => {
      await request(app.getHttpServer() as App)
         .get('/auth/me')
         .expect(401);
   });

   it('/auth/me (GET) - protected route should allow valid Bearer token', async () => {
      const privateKey = JwtUtil.readKeyFile('apps/auth/keys/private.key') || DEFAULT_DEV_RSA_PRIVATE_KEY;

      const token = JwtUtil.sign(
         { sub: 'usr_mock_123', email: 'john@example.com', roles: ['USER'], tokenType: 'access' },
         privateKey,
         3600,
         { keyid: configService.jwtKeyId },
      );

      const res = await request(app.getHttpServer() as App)
         .get('/auth/me')
         .set('Authorization', `Bearer ${token}`)
         .expect(200);

      const body = res.body as { sub: string; email: string };
      expect(body.sub).toBe('usr_mock_123');
      expect(body.email).toBe('john@example.com');
   });
});
