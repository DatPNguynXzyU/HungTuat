import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import {
   MEDIA_PATTERNS,
   MEDIA_PROVIDERS,
   MEDIA_TYPES,
   MEDIA_STATUSES,
   type MediaResponseDto,
   UploadUrlResponseDto,
} from '@contracts/media';
import { RabbitMqMediaAdapter } from '@user/adapters/media/rabbitmq-media.adapter';

describe('RabbitMqMediaAdapter', () => {
   let adapter: RabbitMqMediaAdapter;
   let mediaClient: jest.Mocked<Partial<ClientProxy>>;

   beforeEach(async () => {
      mediaClient = {
         send: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RabbitMqMediaAdapter,
            {
               provide: SERVICES.MEDIA_SERVICE,
               useValue: mediaClient,
            },
         ],
      }).compile();

      adapter = module.get<RabbitMqMediaAdapter>(RabbitMqMediaAdapter);
   });

   it('should be defined', () => {
      expect(adapter).toBeDefined();
   });

   it('should upload avatar and return response', async () => {
      const mockResult: MediaResponseDto = {
         id: 'media_uuid_123',
         userId: 'u1',
         provider: MEDIA_PROVIDERS.CLOUDFLARE_R2,
         type: MEDIA_TYPES.IMAGE,
         key: 'avatar-key',
         url: 'https://cdn.example.com/avatar.jpg',
         size: 1024,
         mimeType: 'image/jpeg',
         status: MEDIA_STATUSES.READY,
         createdAt: new Date(),
         updatedAt: new Date(),
      };
      (mediaClient.send as jest.Mock).mockReturnValue(of(mockResult));

      const res = await adapter.uploadAvatar({
         userId: 'u1',
         fileBase64: 'abc123base64',
         mimeType: 'image/jpeg',
      });

      expect(res).toEqual(mockResult);
      expect(mediaClient.send).toHaveBeenCalledWith(
         { cmd: MEDIA_PATTERNS.UPLOAD_FILE },
         expect.objectContaining({
            user: { userId: 'u1' },
         }),
      );
   });

   it('should request avatar upload signature and return upload url response', async () => {
      const mockSignature: UploadUrlResponseDto = {
         mediaId: 'media_uuid_pending_1',
         provider: MEDIA_PROVIDERS.CLOUDFLARE_R2,
         method: 'PUT',
         uploadUrl: 'https://upload.example.com',
         key: 'avatar-key',
      };
      (mediaClient.send as jest.Mock).mockReturnValue(of(mockSignature));

      const res = await adapter.getAvatarUploadSignature('u1');

      expect(res).toEqual(mockSignature);
      expect(mediaClient.send).toHaveBeenCalledWith(
         { cmd: MEDIA_PATTERNS.GET_UPLOAD_URL },
         expect.objectContaining({
            user: { userId: 'u1' },
         }),
      );
   });
});
