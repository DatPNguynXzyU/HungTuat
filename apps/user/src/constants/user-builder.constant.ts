import { USER_ERROR_CODES } from '@contracts/user';

/**
 * Type-safe error codes for user builders adhering to i18n standards.
 */
export const USER_BUILDER_ERRORS = {
   USER_ID_REQUIRED: USER_ERROR_CODES.USER_ID_REQUIRED,
   FOLLOW_NOT_FOUND: USER_ERROR_CODES.FOLLOW_NOT_FOUND,
   INVALID_DATE_FORMAT: 'USER.INVALID_DATE_FORMAT',
   INVALID_GENDER: 'USER.INVALID_GENDER',
} as const;

export type UserBuilderErrorCode = (typeof USER_BUILDER_ERRORS)[keyof typeof USER_BUILDER_ERRORS];
