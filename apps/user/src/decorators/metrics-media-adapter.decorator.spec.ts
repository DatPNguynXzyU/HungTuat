import { AppLogger } from '@common';
import {
   MEDIA_PROVIDERS,
   MEDIA_STATUSES,
   MEDIA_TYPES,
   type MediaResponseDto,
   type UploadUrlResponseDto,
} from '@contracts/media';
import { USER_METRICS_MEDIA_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type { IMediaAdapter } from '@user/adapters/media/media.adapter.interface';
import type { IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';
import { MetricsMediaAdapterDecorator } from '@user/decorators/metrics-media-adapter.decorator';

describe('MetricsMediaAdapterDecorator', () => {
   let decorator: MetricsMediaAdapterDecorator;
   let mockInner: jest.Mocked<IMediaAdapter>;
   let mockMetricsService: jest.Mocked<IUserMetricsService>;
   let mockLogger: jest.Mocked<AppLogger>;

   beforeEach(() => {
      mockInner = {
         uploadAvatar: jest.fn(),
         getAvatarUploadSignature: jest.fn(),
      };

      mockMetricsService = {
         contentType: 'text/plain',
         getMetrics: jest.fn(),
         recordMediaOperation: jest.fn(),
         recordSearchOperation: jest.fn(),
         recordNotificationOperation: jest.fn(),
         recordDomainOperation: jest.fn(),
         recordGraphSyncOperation: jest.fn(),
         observeMediaDuration: jest.fn(),
         observeSearchDuration: jest.fn(),
         observeGraphSyncDuration: jest.fn(),
         setTotalUsers: jest.fn(),
         setTotalFollows: jest.fn(),
         startTimer: jest.fn().mockReturnValue(1000),
         calculateDuration: jest.fn().mockReturnValue(0.25),
         reset: jest.fn(),
      };

      mockLogger = {
         setContext: jest.fn(),
         log: jest.fn(),
         error: jest.fn(),
         warn: jest.fn(),
         debug: jest.fn(),
      } as unknown as jest.Mocked<AppLogger>;

      decorator = new MetricsMediaAdapterDecorator(mockInner, mockMetricsService, mockLogger);
   });

   describe('uploadAvatar', () => {
      it('should measure upload duration and record success metrics', async () => {
         const expectedResponse: MediaResponseDto = {
            id: 'm1',
            userId: 'u1',
            provider: MEDIA_PROVIDERS.CLOUDFLARE_R2,
            type: MEDIA_TYPES.IMAGE,
            url: 'https://cdn.example.com/avatar.jpg',
            key: 'avatars/avatar.jpg',
            size: 1024,
            mimeType: 'image/jpeg',
            status: MEDIA_STATUSES.READY,
            createdAt: new Date(),
            updatedAt: new Date(),
         };
         mockInner.uploadAvatar.mockResolvedValue(expectedResponse);

         const result = await decorator.uploadAvatar({
            userId: 'u1',
            fileBase64: 'abc',
            mimeType: 'image/jpeg',
         });

         expect(result).toBe(expectedResponse);
         expect(mockMetricsService.startTimer).toHaveBeenCalled();
         expect(mockMetricsService.calculateDuration).toHaveBeenCalledWith(1000);
         expect(mockMetricsService.observeMediaDuration).toHaveBeenCalledWith(0.25);
         expect(mockMetricsService.recordMediaOperation).toHaveBeenCalledWith(
            USER_METRICS_MEDIA_OPERATIONS.UPLOAD_AVATAR,
            USER_METRICS_STATUS.SUCCESS,
         );
         expect(mockLogger.log).toHaveBeenCalledTimes(2);
      });

      it('should record failure metrics and rethrow on inner error', async () => {
         const error = new Error('Upload rejected');
         mockInner.uploadAvatar.mockRejectedValue(error);

         await expect(
            decorator.uploadAvatar({
               userId: 'u1',
               fileBase64: 'abc',
            }),
         ).rejects.toThrow(error);

         expect(mockMetricsService.recordMediaOperation).toHaveBeenCalledWith(
            USER_METRICS_MEDIA_OPERATIONS.UPLOAD_AVATAR,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.error).toHaveBeenCalled();
      });
   });

   describe('getAvatarUploadSignature', () => {
      it('should record success metrics and return signature', async () => {
         const expectedSig: UploadUrlResponseDto = {
            mediaId: 'media_uuid_pending_1',
            provider: MEDIA_PROVIDERS.CLOUDFLARE_R2,
            method: 'PUT',
            uploadUrl: 'https://upload.example.com',
            publicUrl: 'https://cdn.example.com/avatar.jpg',
            key: 'avatars/avatar.jpg',
         };
         mockInner.getAvatarUploadSignature.mockResolvedValue(expectedSig);

         const result = await decorator.getAvatarUploadSignature('u1');

         expect(result).toBe(expectedSig);
         expect(mockMetricsService.observeMediaDuration).toHaveBeenCalledWith(0.25);
         expect(mockMetricsService.recordMediaOperation).toHaveBeenCalledWith(
            USER_METRICS_MEDIA_OPERATIONS.GET_UPLOAD_SIGNATURE,
            USER_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record failure metrics on signature retrieval failure', async () => {
         const error = new Error('Signature failure');
         mockInner.getAvatarUploadSignature.mockRejectedValue(error);

         await expect(decorator.getAvatarUploadSignature('u1')).rejects.toThrow(error);

         expect(mockMetricsService.recordMediaOperation).toHaveBeenCalledWith(
            USER_METRICS_MEDIA_OPERATIONS.GET_UPLOAD_SIGNATURE,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.error).toHaveBeenCalled();
      });
   });
});
