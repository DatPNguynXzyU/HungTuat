import { PROFILE_OPERATION_FACTORY, type ProfileOperationType } from '@user/constants';
import type {
   CreateProfileOperation,
   UpdateProfileOperation,
   UpdateUsernameOperation,
   DeleteProfileOperation,
   RestoreProfileOperation,
} from '@user/templates';

export { PROFILE_OPERATION_FACTORY };

export interface IProfileOperationFactory {
   createCreateProfileOperation(): CreateProfileOperation;
   createUpdateProfileOperation(): UpdateProfileOperation;
   createUpdateUsernameOperation(): UpdateUsernameOperation;
   createDeleteProfileOperation(): DeleteProfileOperation;
   createRestoreProfileOperation(): RestoreProfileOperation;
   createOperation<T = unknown>(type: ProfileOperationType): T;
}
