import { PasswordChangeSaga } from './password-change.saga';

describe('PasswordChangeSaga', () => {
   let saga: PasswordChangeSaga;
   let mockAccountRepository: {
      findByEmail: jest.Mock;
      findById: jest.Mock;
      findEmailById: jest.Mock;
      findAllEmails: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      softDelete: jest.Mock;
      delete: jest.Mock;
   };

   beforeEach(() => {
      mockAccountRepository = {
         findByEmail: jest.fn(),
         findById: jest.fn(),
         findEmailById: jest.fn(),
         findAllEmails: jest.fn(),
         create: jest.fn(),
         update: jest.fn().mockResolvedValue(null),
         softDelete: jest.fn(),
         delete: jest.fn(),
      };

      saga = new PasswordChangeSaga(mockAccountRepository);
   });

   it('should do nothing on rollback if password was not updated', async () => {
      saga.setAccount('acc-1', 'old-hash');
      await saga.rollback();
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
   });

   it('should restore old password hash on rollback if marked updated', async () => {
      saga.setAccount('acc-1', 'old-hash');
      saga.markPasswordUpdated();

      await saga.rollback();

      expect(mockAccountRepository.update).toHaveBeenCalledWith('acc-1', {
         passwordHash: 'old-hash',
      });
   });

   it('should handle errors gracefully during rollback without rethrowing', async () => {
      saga.setAccount('acc-1', 'old-hash');
      saga.markPasswordUpdated();

      mockAccountRepository.update.mockRejectedValue(new Error('DB failure'));

      await expect(saga.rollback()).resolves.toBeUndefined();
   });
});
