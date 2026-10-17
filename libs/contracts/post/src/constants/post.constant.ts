export const POST_STATUSES = {
   DRAFT: 'DRAFT',
   PENDING_REVIEW: 'PENDING_REVIEW',
   PUBLISHED: 'PUBLISHED',
   ARCHIVED: 'ARCHIVED',
   DELETED: 'DELETED',
} as const;

export type PostStatus = (typeof POST_STATUSES)[keyof typeof POST_STATUSES];

export const POST_VISIBILITY = {
   PUBLIC: 'PUBLIC',
   FOLLOWERS_ONLY: 'FOLLOWERS_ONLY',
   PRIVATE: 'PRIVATE',
} as const;

export type PostVisibility = (typeof POST_VISIBILITY)[keyof typeof POST_VISIBILITY];

export const POST_ERROR_CODES = {
   POST_NOT_FOUND: 'POST.POST_NOT_FOUND',
   INVALID_CURSOR: 'POST.INVALID_CURSOR',
   FEED_FETCH_FAILED: 'POST.FEED_FETCH_FAILED',
   UNAUTHORIZED: 'POST.UNAUTHORIZED',
} as const;

export type PostErrorCode = (typeof POST_ERROR_CODES)[keyof typeof POST_ERROR_CODES];

export const POST_RESPONSE_MESSAGES = {
   GET_FEED_SUCCESS: 'POSTS.GET_FEED_SUCCESS',
   GET_POST_SUCCESS: 'POSTS.GET_POST_SUCCESS',
   GET_INGREDIENTS_SUCCESS: 'POSTS.GET_INGREDIENTS_SUCCESS',
} as const;

export type PostResponseMessage = (typeof POST_RESPONSE_MESSAGES)[keyof typeof POST_RESPONSE_MESSAGES];

export const POST_PATTERNS = {
   GET_FEED: 'post.get_feed',
   GET_BY_ID: 'post.get_by_id',
   GET_INGREDIENTS: 'post.get_ingredients',
} as const;

export type PostPattern = (typeof POST_PATTERNS)[keyof typeof POST_PATTERNS];
