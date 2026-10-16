/**
 * Type-safe constants and enums for Profile Operations (Template Method Pattern).
 * Follows zero-hardcoding standards across OmniServices.
 */

export const PROFILE_OPERATION_NAMES = {
   CREATE_PROFILE: 'CreateProfileOperation',
   UPDATE_PROFILE: 'UpdateProfileOperation',
   UPDATE_USERNAME: 'UpdateUsernameOperation',
   DELETE_PROFILE: 'DeleteProfileOperation',
   RESTORE_PROFILE: 'RestoreProfileOperation',
} as const;

export type ProfileOperationName = (typeof PROFILE_OPERATION_NAMES)[keyof typeof PROFILE_OPERATION_NAMES];

export const PROFILE_OPERATION_STEPS = {
   VALIDATE: 'Validate',
   EXECUTE: 'Execute',
   SYNC: 'Sync',
} as const;

export type ProfileOperationStep = (typeof PROFILE_OPERATION_STEPS)[keyof typeof PROFILE_OPERATION_STEPS];

export const PROFILE_OPERATION_LOG_MESSAGES = {
   OPERATION_STARTED: 'Profile operation started',
   OPERATION_COMPLETED: 'Profile operation completed successfully',
   OPERATION_FAILED: 'Profile operation failed',
   VALIDATION_FAILED: 'Profile validation failed in operation',
   SYNC_FAILED: 'Profile infrastructure synchronization failed in operation',
   USER_NOT_FOUND_UPSERT: 'User not found during upsert; creating initial user profile',
} as const;

export type ProfileOperationLogMessage =
   (typeof PROFILE_OPERATION_LOG_MESSAGES)[keyof typeof PROFILE_OPERATION_LOG_MESSAGES];
