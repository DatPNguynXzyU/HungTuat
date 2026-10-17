export const USER_DOMAIN_EVENTS = {
   USER_CREATED: 'user.created',
   USER_UPDATED: 'user.updated',
   USER_DELETED: 'user.deleted',
   USER_RESTORED: 'user.restored',
   USERNAME_CHANGED: 'user.username_changed',
   DISPLAY_NAME_CHANGED: 'user.display_name_changed',
   BIO_CHANGED: 'user.bio_changed',
   PROFILE_METADATA_UPDATED: 'user.profile_metadata_updated',
   USER_FOLLOWED: 'user.followed',
   USER_UNFOLLOWED: 'user.unfollowed',
   FOLLOW_REQUEST_ACCEPTED: 'user.follow_request_accepted',
   FOLLOW_REQUEST_REJECTED: 'user.follow_request_rejected',
   AVATAR_UPLOADED: 'user.avatar_uploaded',
} as const;

export type UserDomainEvent = (typeof USER_DOMAIN_EVENTS)[keyof typeof USER_DOMAIN_EVENTS];
