import { RpcException } from '@nestjs/microservices';
import { EMPTY, firstValueFrom } from 'rxjs';
import { BadRequestException } from '@common/exceptions';
import { AllRpcExceptionsFilter } from '@common/filters/all-rpc-exceptions.filter';

describe('AllRpcExceptionsFilter', () => {
   let filter: AllRpcExceptionsFilter;

   beforeEach(() => {
      filter = new AllRpcExceptionsFilter();
   });

   it('should catch AppException and transform into RpcException with payload', async () => {
      const appException = new BadRequestException('AUTH.EMAIL_ALREADY_EXISTS', {
         params: { email: 'test@example.com' },
      });

      const result$ = filter.catch(appException);

      await expect(firstValueFrom(result$)).rejects.toThrow(RpcException);

      try {
         await firstValueFrom(result$);
      } catch (err) {
         expect(err).toBeInstanceOf(RpcException);
         const rpcError = (err as RpcException).getError();
         const actualPayload: unknown = typeof rpcError === 'string' ? JSON.parse(rpcError) : rpcError;
         expect(actualPayload).toEqual({
            statusCode: 400,
            errorCode: 'AUTH.EMAIL_ALREADY_EXISTS',
            message: 'AUTH.EMAIL_ALREADY_EXISTS',
            params: { email: 'test@example.com' },
         });
      }
   });

   it('should delegate to AllExceptionsFilter when host type is http', () => {
      const mockResponse = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn(),
         setHeader: jest.fn(),
      };
      const mockRequest = {
         url: '/test',
         method: 'GET',
         headers: {},
      };
      const mockHost = {
         getType: jest.fn().mockReturnValue('http'),
         switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
            getRequest: jest.fn().mockReturnValue(mockRequest),
         }),
      };

      const appException = new BadRequestException('COMMON.INVALID_REQUEST');
      const result$ = filter.catch(appException, mockHost as never);

      expect(result$).toBe(EMPTY);
      expect(mockHost.getType).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
   });
});
