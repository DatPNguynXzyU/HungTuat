import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '@auth/auth.module';
import { AuthService } from '@auth/auth.service';
import { PrismaService } from '@auth/prisma';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('AuthModule (e2e)', () => {
   let moduleFixture: TestingModule;
   let authService: AuthService;
   let prismaService: PrismaService;

   beforeAll(async () => {
      moduleFixture = await Test.createTestingModule({
         imports: [AuthModule],
      }).compile();

      authService = moduleFixture.get<AuthService>(AuthService);
      prismaService = moduleFixture.get<PrismaService>(PrismaService);
   });

   beforeEach(async () => {
      await prismaService.user.deleteMany({
         where: { email: 'e2e@example.com' },
      });
   });

   afterAll(async () => {
      await prismaService.user.deleteMany({
         where: { email: 'e2e@example.com' },
      });
      await moduleFixture.close();
   });

   it('should compile and register/login user with UUIDv7 ID', async () => {
      expect(authService).toBeDefined();

      const user = await authService.register({
         email: 'e2e@example.com',
         password: 'password123',
         fullName: 'E2E User',
      });

      expect(user.user.email).toBe('e2e@example.com');
      expect(user.user.id).toBeDefined();
      expect(UUID_V7_REGEX.test(user.user.id)).toBe(true);
      expect(user.accessToken).toBeDefined();

      const validation = await authService.validateToken(user.accessToken);
      expect(validation.valid).toBe(true);
      expect(validation.user.email).toBe('e2e@example.com');
   });
});
