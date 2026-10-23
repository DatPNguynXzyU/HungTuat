import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
   ApiErrorResponses,
   COMMON_ERROR_CODES,
   CORRELATION_ID_HEADER,
   CurrentUser,
   type JwtPayload,
   ResponseMessage,
} from '@common';
import {
   ConfirmUploadDto,
   DeleteMediaResponseDto,
   GetUploadUrlDto,
   MEDIA_ERROR_CODES,
   MEDIA_RESPONSE_MESSAGES,
   MediaResponseDto,
   UploadFileDto,
   UploadUrlResponseDto,
} from '@contracts/media';
import { MediaService } from '@gateway/modules/media/media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
   constructor(private readonly mediaService: MediaService) {}

   @Post('upload-url')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getDirectUploadUrl',
      summary: 'Get authorized presigned URL or signature for direct client-to-storage upload',
      description:
         'Generates a direct upload target (S3/R2 presigned PUT URL for video/large files, or Cloudinary signature for images/avatars) to bypass backend bandwidth.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Upload target URL and authorization parameters generated successfully.',
      type: UploadUrlResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid upload parameters or unsupported media type',
         errorCodes: [MEDIA_ERROR_CODES.INVALID_FILE_TYPE, MEDIA_ERROR_CODES.UNSUPPORTED_PROVIDER],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or missing credentials',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
   ])
   @ResponseMessage(MEDIA_RESPONSE_MESSAGES.GET_UPLOAD_URL_SUCCESS)
   async getUploadUrl(
      @Body() dto: GetUploadUrlDto,
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<UploadUrlResponseDto> {
      const correlationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
      return this.mediaService.getUploadUrl(dto, user, correlationId);
   }

   @Post('upload')
   @HttpCode(HttpStatus.CREATED)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'uploadMediaFile',
      summary: 'Upload media file directly to storage via backend',
      description: 'Uploads a base64 encoded media payload to the selected storage provider.',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Media file uploaded and registered successfully.',
      type: MediaResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid payload or upload failure',
         errorCodes: [MEDIA_ERROR_CODES.FILE_REQUIRED, MEDIA_ERROR_CODES.UPLOAD_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
   ])
   @ResponseMessage(MEDIA_RESPONSE_MESSAGES.UPLOAD_SUCCESS)
   async uploadFile(
      @Body() dto: UploadFileDto,
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<MediaResponseDto> {
      const correlationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
      return this.mediaService.uploadFile(dto, user, correlationId);
   }

   @Post('confirm')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'confirmDirectUpload',
      summary: 'Confirm direct client upload completion',
      description: 'Verifies and marks a pending media entity as READY for use in the system.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Media entity confirmed and updated to ready state.',
      type: MediaResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Media record not found',
         errorCodes: [MEDIA_ERROR_CODES.MEDIA_NOT_FOUND],
      },
      {
         status: HttpStatus.FORBIDDEN,
         description: 'User does not have permission to confirm this media entity',
         errorCodes: [MEDIA_ERROR_CODES.CONFIRMATION_FAILED],
      },
   ])
   @ResponseMessage(MEDIA_RESPONSE_MESSAGES.CONFIRM_UPLOAD_SUCCESS)
   async confirmUpload(
      @Body() dto: ConfirmUploadDto,
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<MediaResponseDto> {
      const correlationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
      return this.mediaService.confirmUpload(dto, user, correlationId);
   }

   @Get(':id')
   @ApiOperation({
      operationId: 'getMediaById',
      summary: 'Get media entity details by identifier',
      description: 'Retrieves metadata and public URL for a specific media asset.',
   })
   @ApiParam({
      name: 'id',
      description: 'UUID of the media entity',
      example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Media entity details retrieved successfully.',
      type: MediaResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Media asset not found',
         errorCodes: [MEDIA_ERROR_CODES.MEDIA_NOT_FOUND],
      },
   ])
   @ResponseMessage(MEDIA_RESPONSE_MESSAGES.GET_MEDIA_SUCCESS)
   async getMediaById(@Param('id') id: string): Promise<MediaResponseDto> {
      return this.mediaService.getMediaById(id);
   }

   @Delete(':id')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'deleteMediaAsset',
      summary: 'Delete media asset from storage and database',
      description: 'Deletes the file from storage provider (Cloudinary or R2) and removes its metadata.',
   })
   @ApiParam({
      name: 'id',
      description: 'UUID of the media asset to delete',
      example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Media asset deleted successfully.',
      type: DeleteMediaResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Media asset not found',
         errorCodes: [MEDIA_ERROR_CODES.MEDIA_NOT_FOUND],
      },
      {
         status: HttpStatus.FORBIDDEN,
         description: 'User does not have permission to delete this media asset',
         errorCodes: [
            MEDIA_ERROR_CODES.CONFIRMATION_FAILED,
            COMMON_ERROR_CODES.FORBIDDEN,
            COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN,
         ],
      },
   ])
   @ResponseMessage(MEDIA_RESPONSE_MESSAGES.DELETE_MEDIA_SUCCESS)
   async deleteMedia(
      @Param('id') id: string,
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<DeleteMediaResponseDto> {
      const correlationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
      return this.mediaService.deleteMedia(id, user, correlationId);
   }
}
