import { USER_STATUS, AUTH_ERROR_CODES } from '@contracts/auth';
import {
   AccountNotBlockedSpecification,
   AccountActiveSpecification,
   AccountCanAuthenticateSpecification,
   PasswordMustChangeSpecification,
   SessionBelongsToAccountSpecification,
} from '@auth/domain/specifications';

describe('Auth Domain Specifications', () => {
   describe('AccountNotBlockedSpecification', () => {
      const spec = new AccountNotBlockedSpecification();

      it('should be satisfied for ACTIVE account', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.ACTIVE })).toBe(true);
         expect(spec.validate({ status: USER_STATUS.ACTIVE }).isSuccess()).toBe(true);
      });

      it('should fail when status is BLOCKED', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.BLOCKED })).toBe(false);
         const res = spec.validate({ status: USER_STATUS.BLOCKED });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      });

      it('should fail when status is SUSPENDED', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.SUSPENDED })).toBe(false);
         const res = spec.validate({ status: USER_STATUS.SUSPENDED });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      });

      it('should be satisfied if candidate status is undefined or null', () => {
         expect(spec.isSatisfiedBy({ status: undefined })).toBe(true);
      });
   });

   describe('AccountActiveSpecification', () => {
      const spec = new AccountActiveSpecification();

      it('should be satisfied for ACTIVE account', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.ACTIVE })).toBe(true);
         expect(spec.validate({ status: USER_STATUS.ACTIVE }).isSuccess()).toBe(true);
      });

      it('should fail when status is INACTIVE', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.INACTIVE })).toBe(false);
         const res = spec.validate({ status: USER_STATUS.INACTIVE });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      });
   });

   describe('AccountCanAuthenticateSpecification (Composite)', () => {
      const spec = new AccountCanAuthenticateSpecification();

      it('should be satisfied when account is ACTIVE', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.ACTIVE })).toBe(true);
         expect(spec.validate({ status: USER_STATUS.ACTIVE }).isSuccess()).toBe(true);
      });

      it('should return ACCOUNT_BLOCKED error when account is BLOCKED', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.BLOCKED })).toBe(false);
         const res = spec.validate({ status: USER_STATUS.BLOCKED });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      });

      it('should return ACCOUNT_BLOCKED error when account is SUSPENDED', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.SUSPENDED })).toBe(false);
         const res = spec.validate({ status: USER_STATUS.SUSPENDED });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      });

      it('should return ACCOUNT_INACTIVE error when account is INACTIVE', () => {
         expect(spec.isSatisfiedBy({ status: USER_STATUS.INACTIVE })).toBe(false);
         const res = spec.validate({ status: USER_STATUS.INACTIVE });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      });
   });

   describe('PasswordMustChangeSpecification', () => {
      const spec = new PasswordMustChangeSpecification();

      it('should be satisfied when new password differs from current password', () => {
         expect(spec.isSatisfiedBy({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' })).toBe(true);
         const res = spec.validate({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
         expect(res.isSuccess()).toBe(true);
      });

      it('should fail when new password is identical to current password', () => {
         expect(spec.isSatisfiedBy({ currentPassword: 'SamePassword123!', newPassword: 'SamePassword123!' })).toBe(
            false,
         );
         const res = spec.validate({ currentPassword: 'SamePassword123!', newPassword: 'SamePassword123!' });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.PASSWORD_UNCHANGED);
      });
   });

   describe('SessionBelongsToAccountSpecification', () => {
      const spec = new SessionBelongsToAccountSpecification();

      it('should be satisfied when session belongs to account', () => {
         expect(spec.isSatisfiedBy({ session: { accountId: 'acc-1' }, accountId: 'acc-1' })).toBe(true);
         expect(spec.validate({ session: { accountId: 'acc-1' }, accountId: 'acc-1' }).isSuccess()).toBe(true);
      });

      it('should fail when session accountId does not match', () => {
         expect(spec.isSatisfiedBy({ session: { accountId: 'acc-2' }, accountId: 'acc-1' })).toBe(false);
         const res = spec.validate({ session: { accountId: 'acc-2' }, accountId: 'acc-1' });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(AUTH_ERROR_CODES.SESSION_NOT_FOUND);
      });

      it('should fail when session is null or undefined', () => {
         expect(spec.isSatisfiedBy({ session: null, accountId: 'acc-1' })).toBe(false);
      });
   });
});
