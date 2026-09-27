import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IBaseResponse, IErrorResponse, IValidationErrorDetail } from '@common/interfaces/response.interface';
import { PaginationMetaDto } from '@common/dto/pagination.dto';

export class BaseResponseDto<T = unknown> implements IBaseResponse<T> {
   @ApiProperty({ example: true })
   success: boolean;

   @ApiProperty({ example: 200 })
   statusCode: number;

   @ApiProperty({ example: 'SUCCESS' })
   message: string;

   @ApiPropertyOptional()
   data: T | null;

   @ApiPropertyOptional({ type: PaginationMetaDto })
   meta?: PaginationMetaDto;

   @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
   timestamp: string;

   @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
   correlationId?: string;
}

export class ValidationErrorDetailDto implements IValidationErrorDetail {
   @ApiProperty({ example: 'email' })
   field: string;

   @ApiProperty({ example: 'email must be an email' })
   message: string;

   @ApiPropertyOptional({ example: 'isEmail' })
   code?: string;

   @ApiPropertyOptional({ example: { min: 6 } })
   params?: Record<string, unknown>;
}

export class ErrorResponseDto implements IErrorResponse {
   @ApiProperty({ example: false })
   success: false;

   @ApiProperty({ example: 400 })
   statusCode: number;

   @ApiProperty({ example: 'AUTH.EMAIL_ALREADY_EXISTS' })
   message: string;

   @ApiProperty({ example: 'Bad Request' })
   error: string;

   @ApiPropertyOptional({ example: 'AUTH.EMAIL_ALREADY_EXISTS' })
   errorCode?: string;

   @ApiPropertyOptional({ example: { field: 'email' } })
   params?: Record<string, unknown>;

   @ApiPropertyOptional()
   details?: unknown;

   @ApiPropertyOptional({ type: [ValidationErrorDetailDto] })
   errors?: ValidationErrorDetailDto[];

   @ApiProperty({ example: '/api/v1/auth/login' })
   path: string;

   @ApiProperty({ example: 'POST' })
   method: string;

   @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
   timestamp: string;

   @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
   correlationId?: string;
}
