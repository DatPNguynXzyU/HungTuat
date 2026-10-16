import { FOLLOW_FIELDS, type FollowField } from '@user/constants';

/**
 * Resolves which target field is missing from a follow pair identifier payload.
 * Returns null if both fields are present.
 */
export function resolveMissingFollowTargetField(payload: {
   followerId?: string | null;
   followingId?: string | null;
}): FollowField | null {
   if (!payload.followerId) {
      return FOLLOW_FIELDS.FOLLOWER_ID;
   }
   if (!payload.followingId) {
      return FOLLOW_FIELDS.FOLLOWING_ID;
   }
   return null;
}

/**
 * Creates standardized error parameters for a follower-following pair.
 */
export function createFollowPairParams(followerId: string, followingId: string): Record<string, string> {
   return {
      [FOLLOW_FIELDS.FOLLOWER_ID]: followerId,
      [FOLLOW_FIELDS.FOLLOWING_ID]: followingId,
   };
}

/**
 * Creates standardized error parameters for a single follow entity ID.
 */
export function createFollowIdParams(followId: string): Record<string, string> {
   return {
      [FOLLOW_FIELDS.FOLLOW_ID]: followId,
   };
}

/**
 * Creates standardized error parameters indicating a required field is missing.
 */
export function createMissingFieldParams(
   field: FollowField,
   paramKey: typeof FOLLOW_FIELDS.MISSING_FIELD | typeof FOLLOW_FIELDS.FIELD = FOLLOW_FIELDS.MISSING_FIELD,
): Record<string, string> {
   return {
      [paramKey]: field,
   };
}
