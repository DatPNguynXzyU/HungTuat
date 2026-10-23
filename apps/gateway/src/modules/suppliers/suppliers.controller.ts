import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
   ApiErrorResponses,
   COMMON_ERROR_CODES,
   CORRELATION_ID_HEADER,
   CurrentUser,
   type JwtPayload,
   ResponseMessage,
} from '@common';
import {
   MySupplierResponseDto,
   RegisterSupplierDto,
   SUPPLIER_ERROR_CODES,
   SUPPLIER_RESPONSE_MESSAGES,
   SupplierItemDto,
} from '@contracts/supplier';
import { SuppliersService } from '@/modules/suppliers/suppliers.service';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
   constructor(private readonly suppliersService: SuppliersService) {}

   @Post()
   @ApiCookieAuth()
   @ApiBearerAuth()
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({
      operationId: 'registerSupplier',
      summary: 'Register a new supplier store or vendor',
      description:
         'Registers a new vendor, merchant, or supermarket as an ingredient supplier linked to the authenticated user account.',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Supplier registered successfully.',
      type: SupplierItemDto,
      links: {
         GetMySupplier: {
            operationId: 'getMySupplierProfile',
            description: 'Check supplier onboarding state or retrieve store profile',
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token is missing, expired, or invalid',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'Supplier code/slug already exists, or user already registered a supplier',
         errorCodes: [
            SUPPLIER_ERROR_CODES.SUPPLIER_CODE_ALREADY_EXISTS,
            SUPPLIER_ERROR_CODES.SUPPLIER_SLUG_ALREADY_EXISTS,
            SUPPLIER_ERROR_CODES.SUPPLIER_ALREADY_EXISTS,
         ],
      },
   ])
   @ResponseMessage(SUPPLIER_RESPONSE_MESSAGES.REGISTER_SUPPLIER_SUCCESS)
   async registerSupplier(
      @Body() dto: RegisterSupplierDto,
      @Req() req: Request,
      @CurrentUser() user?: JwtPayload,
   ): Promise<SupplierItemDto> {
      const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || undefined;

      return this.suppliersService.registerSupplier(dto, {
         correlationId,
         accountId: user?.sub,
         roles: user?.roles,
         permissions: user?.permissions,
         email: user?.email,
      });
   }

   @Get('me')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getMySupplierProfile',
      summary: 'Get supplier onboarding status and store profile for the authenticated merchant',
      description:
         'Returns the supplier profile and member role if the authenticated account has completed store onboarding, or hasSupplier=false if onboarding is required.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Supplier profile and onboarding status retrieved successfully.',
      type: MySupplierResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token is missing, expired, or invalid',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
   ])
   @ResponseMessage(SUPPLIER_RESPONSE_MESSAGES.GET_MY_SUPPLIER_SUCCESS)
   async getMySupplier(@Req() req: Request, @CurrentUser() user?: JwtPayload): Promise<MySupplierResponseDto> {
      const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || undefined;

      return this.suppliersService.getMySupplier({
         correlationId,
         accountId: user?.sub,
         roles: user?.roles,
         permissions: user?.permissions,
         email: user?.email,
      });
   }
}
