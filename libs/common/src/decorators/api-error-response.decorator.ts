import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/base-response.dto';

export interface IApiErrorResponseConfig {
   status: HttpStatus | number;
   description?: string;
   errorCodes: readonly string[] | string[];
   exampleParams?: Record<string, unknown>;
}

/**
 * Swagger OpenAPI 3.0 decorator to document structured error responses with i18n error codes.
 * Generates both schema enum definition and interactive multi-example dropdowns in Swagger UI.
 */
export function ApiErrorResponse(config: IApiErrorResponseConfig): MethodDecorator & ClassDecorator {
   const statusName = HttpStatus[config.status] || 'Error';
   const examples: Record<string, { summary: string; value: Record<string, unknown> }> = {};

   for (const code of config.errorCodes) {
      const exampleKey = code.replace(/\./g, '_');
      examples[exampleKey] = {
         summary: code,
         value: {
            success: false,
            statusCode: config.status,
            errorCode: code,
            message: code,
            error: statusName,
            ...(config.exampleParams ? { params: config.exampleParams } : {}),
            path: '/api/v1/...',
            timestamp: '2026-10-10T08:00:00.000Z',
            correlationId: 'req-123456',
         },
      };
   }

   return applyDecorators(
      ApiExtraModels(ErrorResponseDto),
      ApiResponse({
         status: config.status,
         description:
            config.description || `Error response for HTTP ${config.status} (${config.errorCodes.join(', ')})`,
         content: {
            'application/json': {
               schema: {
                  allOf: [
                     { $ref: getSchemaPath(ErrorResponseDto) },
                     {
                        properties: {
                           statusCode: { type: 'number', example: config.status },
                           errorCode: {
                              type: 'string',
                              enum: [...config.errorCodes],
                              example: config.errorCodes[0],
                              description: `Possible error codes: ${config.errorCodes.join(', ')}`,
                           },
                           message: {
                              type: 'string',
                              enum: [...config.errorCodes],
                              example: config.errorCodes[0],
                           },
                           ...(config.exampleParams
                              ? {
                                   params: {
                                      type: 'object',
                                      example: config.exampleParams,
                                   },
                                }
                              : {}),
                        },
                     },
                  ],
               },
               examples,
            },
         },
      }),
   );
}

/**
 * Swagger OpenAPI 3.0 decorator to document multiple error response scenarios.
 */
export function ApiErrorResponses(configs: IApiErrorResponseConfig[]): MethodDecorator & ClassDecorator {
   return applyDecorators(...configs.map((config) => ApiErrorResponse(config)));
}
