import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ClientProxy, type ClientGrpc } from '@nestjs/microservices';
import { createGrpcMetadata, handleGrpcError, IServiceMessage, SERVICE_NAMES, SERVICES } from '@common';
import {
   HEALTH_GRPC_SERVICE_NAME,
   ServingStatus,
   type IHealthCheckResponse,
   type IHealthGrpcService,
} from '@contracts/health';
import {
   CreateUserProfileDto,
   UserDateOfBirthResponseDto,
   USER_PATTERNS,
   UpdatePersonalInfoDto,
   USER_V1_GRPC_CLIENT,
   USER_V1_GRPC_SERVICE_NAME,
   type IUserV1GrpcService,
} from '@contracts/user';
import { firstValueFrom } from 'rxjs';
import type { JwtPayload } from '@common/utils/jwt.util';

@Injectable()
export class UsersService implements OnModuleInit {
   private userGrpcService!: IUserV1GrpcService;

   constructor(
      @Inject(SERVICES.USER_SERVICE) private readonly userClient: ClientProxy,
      @Inject(USER_V1_GRPC_CLIENT) private readonly userGrpcClient: ClientGrpc,
   ) {}

   onModuleInit(): void {
      this.userGrpcService = this.userGrpcClient.getService<IUserV1GrpcService>(USER_V1_GRPC_SERVICE_NAME);
   }

   async checkUsername(username: string, correlationId?: string): Promise<{ available: boolean; username: string }> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         return await firstValueFrom(this.userGrpcService.checkUsername({ username }, metadata));
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async checkGrpcHealth(): Promise<IHealthCheckResponse> {
      try {
         const healthService = this.userGrpcClient.getService<IHealthGrpcService>(HEALTH_GRPC_SERVICE_NAME);
         return await firstValueFrom(healthService.check({ service: USER_V1_GRPC_SERVICE_NAME }));
      } catch {
         return { status: ServingStatus.NOT_SERVING };
      }
   }

   async createProfile(createUserProfileDto: CreateUserProfileDto, user: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<CreateUserProfileDto> = {
         data: createUserProfileDto,
         user: {
            userId: user.sub,
            email: user.email,
            roles: user.roles || [],
            permissions: [],
            sessionId: user.jti,
         },
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<CreateUserProfileDto>>(
            { cmd: USER_PATTERNS.CREATE_PROFILE },
            message,
         ),
      );
   }

   async getUserById(id: string, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string }> = {
         data: { id },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string }>>({ cmd: USER_PATTERNS.GET_USER_BY_ID }, message),
      );
   }

   async getAllUsers(page = 1, limit = 10, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ page: number; limit: number }> = {
         data: { page, limit },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ page: number; limit: number }>>(
            { cmd: USER_PATTERNS.GET_ALL_USERS },
            message,
         ),
      );
   }

   private buildUserContext(user?: JwtPayload) {
      return user
         ? {
              userId: user.sub,
              email: user.email,
              roles: user.roles || [],
              permissions: [],
              sessionId: user.jti,
           }
         : undefined;
   }

   async updateUsername(userId: string, username: string, user: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ userId: string; username: string }> = {
         data: { userId, username },
         user: this.buildUserContext(user),
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ userId: string; username: string }>>(
            { cmd: USER_PATTERNS.UPDATE_USERNAME },
            message,
         ),
      );
   }

   async updateDisplayName(userId: string, displayName: string, user: JwtPayload): Promise<unknown> {
      return this.updatePartialProfile(userId, { displayName }, user);
   }

   async updateBio(userId: string, bio: string | undefined, user: JwtPayload): Promise<unknown> {
      return this.updatePartialProfile(userId, { bio }, user);
   }

   async updatePersonalInfo(userId: string, dto: UpdatePersonalInfoDto, user: JwtPayload): Promise<unknown> {
      return this.updatePartialProfile(userId, { dateOfBirth: dto.dateOfBirth, gender: dto.gender }, user);
   }

   async updateLocation(userId: string, location: string | undefined, user: JwtPayload): Promise<unknown> {
      return this.updatePartialProfile(userId, { location }, user);
   }

   async updateWebsite(userId: string, website: string | undefined, user: JwtPayload): Promise<unknown> {
      return this.updatePartialProfile(userId, { website }, user);
   }

   async updateCoverImage(userId: string, coverImage: string, user: JwtPayload): Promise<unknown> {
      return this.updatePartialProfile(userId, { coverImage }, user);
   }

   private async updatePartialProfile(
      userId: string,
      fields: Record<string, unknown>,
      user: JwtPayload,
   ): Promise<unknown> {
      const message: IServiceMessage<{ userId: string; id: string } & Record<string, unknown>> = {
         data: { userId, id: userId, ...fields },
         user: this.buildUserContext(user),
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ userId: string; id: string } & Record<string, unknown>>>(
            { cmd: USER_PATTERNS.UPDATE_USER_PROFILE },
            message,
         ),
      );
   }

   async getMyProfile(user: JwtPayload): Promise<unknown> {
      return this.getUserById(user.sub, user);
   }

   async searchUsers(query: string, limit = 10, cursor?: string, user?: JwtPayload): Promise<unknown> {
      return firstValueFrom(
         this.userClient.send<unknown, { query: string; limit: number; cursor?: string; currentUserId?: string }>(
            { cmd: USER_PATTERNS.SEARCH_USERS },
            { query, limit, cursor, currentUserId: user?.sub },
         ),
      );
   }

   async getFollowSuggestions(limit = 10, user: JwtPayload): Promise<unknown> {
      return firstValueFrom(
         this.userClient.send<unknown, { userId: string; limit: number }>(
            { cmd: USER_PATTERNS.GET_FOLLOW_SUGGESTIONS },
            { userId: user.sub, limit },
         ),
      );
   }

   async uploadAvatar(id: string, fileBase64: string, mimeType?: string, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string; fileBase64: string; mimeType?: string }> = {
         data: { id, fileBase64, mimeType },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string; fileBase64: string; mimeType?: string }>>(
            { cmd: USER_PATTERNS.UPLOAD_AVATAR },
            message,
         ),
      );
   }

   async getAvatarUploadSignature(id: string, user?: JwtPayload): Promise<unknown> {
      const message: IServiceMessage<{ id: string }> = {
         data: { id },
         user: user
            ? {
                 userId: user.sub,
                 email: user.email,
                 roles: user.roles || [],
                 permissions: [],
                 sessionId: user.jti,
              }
            : undefined,
      };

      return firstValueFrom(
         this.userClient.send<unknown, IServiceMessage<{ id: string }>>(
            { cmd: USER_PATTERNS.GET_AVATAR_UPLOAD_SIGNATURE },
            message,
         ),
      );
   }

   async getDateOfBirth(userId: string): Promise<UserDateOfBirthResponseDto> {
      return firstValueFrom(
         this.userClient.send<UserDateOfBirthResponseDto, { userId: string }>(
            { cmd: USER_PATTERNS.GET_DATE_OF_BIRTH },
            { userId },
         ),
      );
   }
}
