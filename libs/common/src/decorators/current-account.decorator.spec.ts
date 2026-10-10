import { ExecutionContext } from '@nestjs/common';
import { extractCurrentAccount } from '@common/decorators/current-account.decorator';
import { JwtPayload } from '@common/utils/jwt.util';

describe('CurrentAccount Decorator', () => {
   const mockUser: JwtPayload = {
      sub: 'account-uuid-789',
      email: 'test@example.com',
      roles: ['USER'],
      tokenType: 'access',
   };

   function createMockContext(user?: JwtPayload): ExecutionContext {
      return {
         switchToHttp: () => ({
            getRequest: () => ({ user }),
         }),
      } as unknown as ExecutionContext;
   }

   it('should return null if user is not present on request', () => {
      const ctx = createMockContext(undefined);
      expect(extractCurrentAccount(undefined, ctx)).toBeNull();
   });

   it('should return full user payload when data is undefined', () => {
      const ctx = createMockContext(mockUser);
      expect(extractCurrentAccount(undefined, ctx)).toEqual(mockUser);
   });

   it('should return account id for "id", "accountId", or "sub"', () => {
      const ctx = createMockContext(mockUser);
      expect(extractCurrentAccount('id', ctx)).toBe('account-uuid-789');
      expect(extractCurrentAccount('accountId', ctx)).toBe('account-uuid-789');
      expect(extractCurrentAccount('sub', ctx)).toBe('account-uuid-789');
   });

   it('should return specific property when key is provided', () => {
      const ctx = createMockContext(mockUser);
      expect(extractCurrentAccount('email', ctx)).toBe('test@example.com');
   });
});
