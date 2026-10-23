import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
   ApiErrorResponses,
   COMMON_ERROR_CODES,
   CORRELATION_ID_HEADER,
   CurrentUser,
   type JwtPayload,
   Public,
   ResponseMessage,
} from '@common';
import {
   CategoryItemDto,
   COMMERCE_ERROR_CODES,
   COMMERCE_RESPONSE_MESSAGES,
   CreateIngredientDto,
   CreateProductOfferDto,
   IngredientItemDto,
   IngredientSuppliersResponseDto,
   SearchIngredientsDto,
   SearchIngredientsResponseDto,
   SupplierProductOfferDto,
} from '@contracts/commerce';
import { CommerceService } from '@/modules/commerce/commerce.service';

@ApiTags('Commerce')
@Controller('commerce')
export class CommerceController {
   constructor(private readonly commerceService: CommerceService) {}

   @Get('ingredients')
   @Public()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'searchIngredients',
      summary: 'Search and autocomplete standardized cooking ingredients',
      description:
         'Allows users creating cooking video posts to quickly search, filter, and pick standardized ingredients from the central catalog instead of typing raw unstandardized text.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Matching ingredients retrieved successfully.',
      type: SearchIngredientsResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid search parameters or pagination limits',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST],
      },
   ])
   @ResponseMessage(COMMERCE_RESPONSE_MESSAGES.SEARCH_INGREDIENTS_SUCCESS)
   async searchIngredients(@Query() query: SearchIngredientsDto): Promise<SearchIngredientsResponseDto> {
      return this.commerceService.searchIngredients(query);
   }

   @Get('ingredients/categories')
   @Public()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'listIngredientCategories',
      summary: 'Get all ingredient categories',
      description:
         'Returns the list of culinary ingredient categories (e.g., Meat, Vegetables, Spices, Dairy) for filtering options in the UI.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Categories retrieved successfully.',
      type: [CategoryItemDto],
   })
   @ResponseMessage(COMMERCE_RESPONSE_MESSAGES.LIST_CATEGORIES_SUCCESS)
   async listCategories(): Promise<CategoryItemDto[]> {
      return this.commerceService.listCategories();
   }

   @Get('ingredients/:ingredientId')
   @Public()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'getIngredientById',
      summary: 'Get ingredient details and available offers',
      description: 'Retrieves complete metadata for an ingredient by its unique UUID.',
   })
   @ApiParam({
      name: 'ingredientId',
      description: 'Unique UUID identifier of the ingredient',
      example: '0192e21b-0002-7000-8000-000000000001',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Ingredient details retrieved successfully.',
      type: IngredientItemDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Ingredient not found in the catalog',
         errorCodes: [COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND],
      },
   ])
   @ResponseMessage(COMMERCE_RESPONSE_MESSAGES.GET_INGREDIENT_SUCCESS)
   async getIngredientById(
      @Param('ingredientId') ingredientId: string,
   ): Promise<{ ingredient: IngredientItemDto; offers: SupplierProductOfferDto[] }> {
      return this.commerceService.getIngredientById(ingredientId);
   }

   @Get('ingredients/:ingredientId/suppliers')
   @Public()
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'getSuppliersByIngredient',
      summary: 'Get available suppliers and purchasing offers for an ingredient',
      description:
         'Enables viewers of a recipe/video post to view all suppliers providing this ingredient with pricing, stock availability, and online purchase links.',
   })
   @ApiParam({
      name: 'ingredientId',
      description: 'Unique UUID identifier of the ingredient',
      example: '0192e21b-0002-7000-8000-000000000001',
   })
   @ApiQuery({
      name: 'inStockOnly',
      required: false,
      type: Boolean,
      description: 'Filter only suppliers with active in-stock inventory',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'List of suppliers and product offers retrieved successfully.',
      type: IngredientSuppliersResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Ingredient not found',
         errorCodes: [COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND],
      },
   ])
   @ResponseMessage(COMMERCE_RESPONSE_MESSAGES.GET_SUPPLIERS_SUCCESS)
   async getSuppliersByIngredient(
      @Param('ingredientId') ingredientId: string,
      @Query('inStockOnly') inStockOnly?: boolean,
   ): Promise<IngredientSuppliersResponseDto> {
      return this.commerceService.getSuppliersByIngredient(ingredientId, Boolean(inStockOnly));
   }

   @Post('ingredients')
   @ApiBearerAuth()
   @ApiCookieAuth()
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({
      operationId: 'createIngredient',
      summary: 'Create and propose a new standardized cooking ingredient',
      description:
         'Adds a new standardized ingredient to the central catalog for creator selection. Requires ADMIN role.',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Ingredient created successfully.',
      type: IngredientItemDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failure or invalid category ID',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST, COMMERCE_ERROR_CODES.CATEGORY_NOT_FOUND],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token is missing or invalid',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.FORBIDDEN,
         description: 'Requires Administrator role',
         errorCodes: [COMMON_ERROR_CODES.FORBIDDEN],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'An ingredient with this name or slug already exists',
         errorCodes: [COMMERCE_ERROR_CODES.INGREDIENT_ALREADY_EXISTS],
      },
   ])
   @ResponseMessage(COMMERCE_RESPONSE_MESSAGES.CREATE_INGREDIENT_SUCCESS)
   async createIngredient(
      @Body() dto: CreateIngredientDto,
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<IngredientItemDto> {
      const correlationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
      return this.commerceService.createIngredient(dto, { user, correlationId });
   }

   @Post('products')
   @ApiBearerAuth()
   @ApiCookieAuth()
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({
      operationId: 'createProductOffer',
      summary: 'Create a supplier product offer for an ingredient',
      description:
         'Links an ingredient to a supplier with specific price, packaging, stock, and online ordering link. Requires supplier owner or ADMIN role.',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Product offer created successfully.',
      type: SupplierProductOfferDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failure',
         errorCodes: [COMMON_ERROR_CODES.INVALID_REQUEST],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token is missing or invalid',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
      {
         status: HttpStatus.FORBIDDEN,
         description: 'Caller is not the supplier owner or Administrator',
         errorCodes: [COMMON_ERROR_CODES.FORBIDDEN, COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Supplier or ingredient not found',
         errorCodes: [COMMERCE_ERROR_CODES.SUPPLIER_NOT_FOUND, COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'Product offer with this SKU already exists for this supplier',
         errorCodes: [COMMERCE_ERROR_CODES.PRODUCT_OFFER_ALREADY_EXISTS],
      },
   ])
   @ResponseMessage(COMMERCE_RESPONSE_MESSAGES.CREATE_PRODUCT_SUCCESS)
   async createProductOffer(
      @Body() dto: CreateProductOfferDto,
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<SupplierProductOfferDto> {
      const correlationId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
      return this.commerceService.createProductOffer(dto, { user, correlationId });
   }
}
