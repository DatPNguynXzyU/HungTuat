import { HttpStatus } from '@nestjs/common';
import {
   ApiErrorResponse,
   ApiErrorResponses,
   IApiErrorResponseConfig,
} from '@common/decorators/api-error-response.decorator';

describe('ApiErrorResponse Decorators', () => {
   it('should apply ApiErrorResponse decorator without errors', () => {
      const config: IApiErrorResponseConfig = {
         status: HttpStatus.BAD_REQUEST,
         description: 'Invalid input',
         errorCodes: ['COMMON.INVALID_REQUEST'],
         exampleParams: { field: 'email' },
      };

      class TestController {
         @ApiErrorResponse(config)
         testMethod() {
            return true;
         }
      }

      expect(TestController).toBeDefined();
   });

   it('should apply ApiErrorResponses decorator with multiple configs without errors', () => {
      class TestController {
         @ApiErrorResponses([
            {
               status: HttpStatus.BAD_REQUEST,
               errorCodes: ['AUTH.EMAIL_ALREADY_EXISTS'],
            },
            {
               status: HttpStatus.UNAUTHORIZED,
               errorCodes: ['AUTH.INVALID_CREDENTIALS'],
            },
         ])
         testMethod() {
            return true;
         }
      }

      expect(TestController).toBeDefined();
   });
});
