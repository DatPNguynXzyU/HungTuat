export const NOTIFICATION_PATTERNS = {
   SEND_EMAIL: 'notification.send_email',
   SEND_WELCOME_EMAIL: 'notification.send_welcome_email',
   SEND_VERIFICATION_EMAIL: 'notification.send_verification_email',
   SEND_RESET_PASSWORD_EMAIL: 'notification.send_reset_password_email',
   SEND_OTP_EMAIL: 'notification.send_otp_email',
} as const;

export const NOTIFICATION_EVENTS = {
   USER_REGISTERED: 'auth.user_registered',
   PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
   EMAIL_VERIFICATION_REQUESTED: 'auth.email_verification_requested',
   OTP_REQUESTED: 'auth.otp_requested',
} as const;

export const NOTIFICATION_CHANNELS = {
   EMAIL: 'EMAIL',
   SMS: 'SMS',
   PUSH: 'PUSH',
} as const;

export const NOTIFICATION_TEMPLATES = {
   CUSTOM_EMAIL: 'CUSTOM_EMAIL',
   WELCOME_EMAIL: 'WELCOME_EMAIL',
   VERIFICATION_EMAIL: 'VERIFICATION_EMAIL',
   RESET_PASSWORD_EMAIL: 'RESET_PASSWORD_EMAIL',
   OTP_EMAIL: 'OTP_EMAIL',
} as const;

export const NOTIFICATION_STATUS = {
   PENDING: 'PENDING',
   SENT: 'SENT',
   FAILED: 'FAILED',
} as const;

export type NotificationPattern = (typeof NOTIFICATION_PATTERNS)[keyof typeof NOTIFICATION_PATTERNS];
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[keyof typeof NOTIFICATION_TEMPLATES];
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];
