import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
   AUTH_COOKIES,
   ApiErrorResponses,
   COMMON_ERROR_CODES,
   CORRELATION_ID_HEADER,
   Public,
   ResponseMessage,
} from '@common';
import {
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
   @Public()
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({
      operationId: 'registerSupplier',
      summary: 'Register a new supplier or vendor',
      description:
         'Registers a new vendor, merchant, or supermarket as an ingredient supplier directly into the supplier microservice. Authentication is verified downstream by the Supplier microservice.',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Supplier registered successfully.',
      type: SupplierItemDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token is missing, expired, or invalid',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'Supplier with this code or name slug already exists',
         errorCodes: [
            SUPPLIER_ERROR_CODES.SUPPLIER_CODE_ALREADY_EXISTS,
            SUPPLIER_ERROR_CODES.SUPPLIER_SLUG_ALREADY_EXISTS,
         ],
      },
   ])
   @ResponseMessage(SUPPLIER_RESPONSE_MESSAGES.REGISTER_SUPPLIER_SUCCESS)
   async registerSupplier(@Body() dto: RegisterSupplierDto, @Req() req: Request): Promise<SupplierItemDto> {
      const authHeader =
         req.headers.authorization ||
         (req.cookies?.[AUTH_COOKIES.ACCESS_TOKEN] ? `Bearer ${req.cookies[AUTH_COOKIES.ACCESS_TOKEN]}` : undefined);

      const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || undefined;

      return this.suppliersService.registerSupplier(dto, {
         authHeader,
         correlationId,
      });
   }
}
