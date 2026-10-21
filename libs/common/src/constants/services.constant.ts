export const SERVICE_NAMES = {
   GATEWAY: 'api-gateway',
   AUTH: 'auth-service',
   USER: 'user-service',
   ORDER: 'order-service',
   NOTIFICATION: 'notification-service',
   POST: 'post-service',
   SEARCH: 'search-service',
   MEDIA: 'media-service',
   COMMERCE: 'commerce-service',
} as const;

export type ServiceName = (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES];
