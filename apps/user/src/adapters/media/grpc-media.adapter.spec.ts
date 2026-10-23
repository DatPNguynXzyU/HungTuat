import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import type { ClientGrpc } from '@nestjs/microservices';
import {
   MEDIA_PROVIDERS,
   MEDIA_TYPES,
   MEDIA_STATUSES,
   MEDIA_V1_GRPC_CLIENT,
   MEDIA_V1_GRPC_SERVICE_NAME,
} from '@contracts/media';
import { GrpcMediaAdapter } from './grpc-media.adapter';

describe('GrpcMediaAdapter', () => {
   let adapter: GrpcMediaAdapter;
   let mockMediaGrpcService: { uploadFile: jest.Mock; getUploadUrl: jest.Mock };
   let grpcClient: jest.Mocked<Partial<ClientGrpc>>;

   beforeEach(async () => {
      mockMediaGrpcService = {
         uploadFile: jest.fn(),
         getUploadUrl: jest.fn(),
      };

      grpcClient = {
         getService: jest.fn().mockReturnValue(mockMediaGrpcService),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            GrpcMediaAdapter,
            {
               provide: MEDIA_V1_GRPC_CLIENT,
               useValue: grpcClient,
            },
         ],
      }).compile();

      adapter = module.get<GrpcMediaAdapter>(GrpcMediaAdapter);
      adapter.onModuleInit();
   });

   it('should be defined and connect gRPC service', () => {
      expect(adapter).toBeDefined();
      expect(grpcClient.getService).toHaveBeenCalledWith(MEDIA_V1_GRPC_SERVICE_NAME);
   });

   it('should upload avatar via gRPC and return mapped response', async () => {
      const mockProto = {
         id: 'media_uuid_123',
         userId: 'u1',
         provider: MEDIA_PROVIDERS.CLOUDFLARE_R2,
         type: MEDIA_TYPES.IMAGE,
         key: 'avatar-key',
         url: 'https://cdn.example.com/avatar.jpg',
         size: 1024,
         mimeType: 'image/jpeg',
         status: MEDIA_STATUSES.READY,
         createdAt: '2026-01-01T00:00:00.000Z',
         updatedAt: '2026-01-02T00:00:00.000Z',
      };

      mockMediaGrpcService.uploadFile.mockReturnValue(of({ media: mockProto }));

      const res = await adapter.uploadAvatar({
         userId: 'u1',
         fileBase64: 'abc123base64',
         mimeType: 'image/jpeg',
      });

      expect(res.id).toBe('media_uuid_123');
      expect(res.userId).toBe('u1');
      expect(res.provider).toBe(MEDIA_PROVIDERS.CLOUDFLARE_R2);
      expect(res.status).toBe(MEDIA_STATUSES.READY);
      expect(mockMediaGrpcService.uploadFile).toHaveBeenCalledWith(
         expect.objectContaining({
            mimeType: 'image/jpeg',
            type: MEDIA_TYPES.IMAGE,
         }),
         expect.anything(),
      );
   });

   it('should request avatar upload signature via gRPC and return upload url response', async () => {
      const mockGrpcUrlRes = {
         mediaId: 'media_uuid_pending_1',
         provider: MEDIA_PROVIDERS.CLOUDFLARE_R2,
         method: 'PUT',
         uploadUrl: 'https://upload.example.com',
         key: 'avatar-key',
      };

      mockMediaGrpcService.getUploadUrl.mockReturnValue(of(mockGrpcUrlRes));

      const res = await adapter.getAvatarUploadSignature('u1');

      expect(res.mediaId).toBe('media_uuid_pending_1');
      expect(res.uploadUrl).toBe('https://upload.example.com');
      expect(mockMediaGrpcService.getUploadUrl).toHaveBeenCalledWith(
         expect.objectContaining({
            mimeType: 'image/jpeg',
            type: MEDIA_TYPES.IMAGE,
         }),
         expect.anything(),
      );
   });
});
