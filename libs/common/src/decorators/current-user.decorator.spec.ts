import { ExecutionContext } from '@nestjs/common';
import { extractCurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/utils/jwt.util';

describe('CurrentUser Decorator', () => {
   const mockUser: JwtPayload = {
      sub: 'user-uuid-123',
      email: 'user@example.com',
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
      expect(extractCurrentUser(undefined, ctx)).toBeNull();
   });

   it('should return full user payload when data is undefined', () => {
      const ctx = createMockContext(mockUser);
      expect(extractCurrentUser(undefined, ctx)).toEqual(mockUser);
   });

   it('should return user id for "id", "userId", or "sub"', () => {
      const ctx = createMockContext(mockUser);
      expect(extractCurrentUser('id', ctx)).toBe('user-uuid-123');
      expect(extractCurrentUser('userId', ctx)).toBe('user-uuid-123');
      expect(extractCurrentUser('sub', ctx)).toBe('user-uuid-123');
   });

   it('should return specific property when key is provided', () => {
      const ctx = createMockContext(mockUser);
      expect(extractCurrentUser('email', ctx)).toBe('user@example.com');
   });
});
