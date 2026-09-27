import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   Argon2Util,
   BadRequestException,
   ChangePasswordDto,
   DEFAULT_ROLES,
   IAuthResult,
   IRevokeTokenResult,
   IValidateTokenResult,
   LoginDto,
   NOTIFICATION_EVENTS,
   RbacCacheService,
   RegisterDto,
   SERVICES,
   USER_STATUS,
   UnauthorizedException,
} from '@common';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';
import type { RoleEntity } from '@auth/entities/user.entity';
import type { IAuthRepository } from '@auth/repositories/auth.repository.interface';
import { AUTH_REPOSITORY } from '@auth/repositories/auth.repository.interface';
import { TokenService } from '@auth/services/token.service';

export type AuthResult = IAuthResult;
export type ValidateTokenResult = IValidateTokenResult;

@Injectable()
export class AuthService {
   private readonly logger = new Logger(AuthService.name);

   constructor(
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: IAuthRepository,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly rbacCacheService: RbacCacheService,
      private readonly tokenService: TokenService,
   ) {}

   private async getOrCacheRole(roleCode: string): Promise<RoleEntity | null> {
      const cached = await this.rbacCacheService.getRole(roleCode);
      if (cached) {
         return cached;
      }

      const role = await this.authRepository.findRoleByCode(roleCode);
      if (role) {
         await this.rbacCacheService.setRole(roleCode, {
            id: role.id,
            code: role.code,
            name: role.name,
            description: role.description,
            permissions: role.permissions || [],
         });
      }

      return role;
   }

   async getRolePermissions(roleCode: string): Promise<string[]> {
      const role = await this.getOrCacheRole(roleCode);
      return role?.permissions || [];
   }

   async register(dto: RegisterDto): Promise<IAuthResult> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.authRepository.findByEmail(normalizedEmail);
      if (existing) {
         throw new BadRequestException(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS, {
            params: { email: normalizedEmail },
         });
      }

      const [defaultRole, passwordHash] = await Promise.all([
         this.getOrCacheRole(DEFAULT_ROLES.USER),
         Argon2Util.hash(dto.password),
      ]);

      const newUser = await this.authRepository.createUser({
         email: normalizedEmail,
         fullName: dto.fullName.trim(),
         passwordHash,
         roleId: defaultRole?.id,
         status: USER_STATUS.ACTIVE,
         isEmailVerified: false,
      });

      const userRoles = newUser.roles && newUser.roles.length > 0 ? newUser.roles : [DEFAULT_ROLES.USER];

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair({
         id: newUser.id,
         email: newUser.email,
         fullName: newUser.fullName,
         roles: userRoles,
      });

      // Emit user registered event to send welcome email asynchronously
      this.logger.log(`Emitting USER_REGISTERED event to notification service for: ${newUser.email}`);
      this.notificationClient
         .emit(NOTIFICATION_EVENTS.USER_REGISTERED, {
            email: newUser.email,
            fullName: newUser.fullName,
         })
         .subscribe({
            error: (err: unknown) => {
               this.logger.error(
                  `Failed to emit USER_REGISTERED event: ${err instanceof Error ? err.message : String(err)}`,
               );
            },
         });

      return {
         user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            roles: userRoles,
            status: newUser.status || USER_STATUS.ACTIVE,
            isEmailVerified: newUser.isEmailVerified ?? false,
            lastLoginAt: newUser.lastLoginAt ?? null,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
         },
         accessToken,
         refreshToken,
      };
   }

   async login(dto: LoginDto): Promise<IAuthResult> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const user = await this.authRepository.findByEmail(normalizedEmail);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      const isValid = await Argon2Util.verify(user.passwordHash, dto.password);
      if (!isValid) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.SUSPENDED) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (user.status === USER_STATUS.INACTIVE) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const userRoles = user.roles && user.roles.length > 0 ? user.roles : [DEFAULT_ROLES.USER];

      // Ensure permissions for user's roles are cached in Redis
      await Promise.all(userRoles.map((role) => this.getOrCacheRole(role)));

      const nowIso = new Date().toISOString();
      await this.authRepository.updateUser(user.id, { lastLoginAt: nowIso });

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair({
         id: user.id,
         email: user.email,
         fullName: user.fullName,
         roles: userRoles,
      });

      return {
         user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
            status: user.status || USER_STATUS.ACTIVE,
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: nowIso,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         },
         accessToken,
         refreshToken,
      };
   }

   async refreshToken(token: string): Promise<IAuthResult> {
      const payload = await this.tokenService.validateRefreshToken(token);

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.SUSPENDED) {
         await this.tokenService.logoutAll(user.id);
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (user.status === USER_STATUS.INACTIVE) {
         await this.tokenService.logoutAll(user.id);
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const userRoles = user.roles && user.roles.length > 0 ? user.roles : payload.roles || [DEFAULT_ROLES.USER];

      // Invalidate old refresh token (Token rotation)
      if (payload.jti) {
         const nowInSeconds = Math.floor(Date.now() / 1000);
         const remainingTtl = payload.exp ? Math.max(payload.exp - nowInSeconds, 0) : undefined;
         await this.tokenService.invalidateRefreshToken(user.id, payload.jti, remainingTtl);
      }

      // Generate new pair of tokens
      const { accessToken, refreshToken: newRefreshToken } = await this.tokenService.generateTokenPair({
         id: user.id,
         email: user.email,
         fullName: user.fullName,
         roles: userRoles,
      });

      return {
         user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
            status: user.status || USER_STATUS.ACTIVE,
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: user.lastLoginAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         },
         accessToken,
         refreshToken: newRefreshToken,
      };
   }

   async revokeToken(token: string): Promise<IRevokeTokenResult> {
      return this.tokenService.revokeToken(token);
   }

   async revokeAllUserTokens(userId: string): Promise<void> {
      await this.tokenService.revokeAllUserTokens(userId);
   }

   async logoutAll(userId: string): Promise<void> {
      await this.tokenService.logoutAll(userId);
   }

   async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
      const user = await this.authRepository.findById(userId);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const isOldValid = await Argon2Util.verify(user.passwordHash, dto.currentPassword);
      if (!isOldValid) {
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_OLD_PASSWORD);
      }

      if (dto.currentPassword === dto.newPassword) {
         throw new BadRequestException(AUTH_ERROR_CODES.PASSWORD_UNCHANGED);
      }

      const newPasswordHash = await Argon2Util.hash(dto.newPassword);
      await this.authRepository.updateUser(userId, { passwordHash: newPasswordHash });

      // Invalidate all active user sessions across devices
      await this.tokenService.logoutAll(userId);

      return {
         success: true,
         message: 'Password changed successfully. All sessions have been logged out.',
      };
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      const payload = this.tokenService.validateAccessToken(token);

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.SUSPENDED) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (user.status === USER_STATUS.INACTIVE) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const userRoles = user.roles && user.roles.length > 0 ? user.roles : payload.roles || [DEFAULT_ROLES.USER];

      return {
         valid: true,
         user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
            status: user.status || USER_STATUS.ACTIVE,
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: user.lastLoginAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         },
      };
   }
}
