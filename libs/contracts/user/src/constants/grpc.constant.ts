import * as fs from 'fs';
import * as path from 'path';

export const USER_GRPC_DOMAIN = 'user';

export const PROTO_VERSIONS = {
   V1: 'v1',
   V2: 'v2',
} as const;

export type ProtoVersion = (typeof PROTO_VERSIONS)[keyof typeof PROTO_VERSIONS];
export const DEFAULT_PROTO_VERSION: ProtoVersion = PROTO_VERSIONS.V1;

/**
 * Builds standard gRPC package name: <domain>.<version> (e.g. user.v1)
 */
export function buildGrpcPackageName(domain: string, version: ProtoVersion): string {
   return `${domain}.${version}`;
}

// Version 1 Constants (Active & Default)
export const USER_V1_GRPC_PACKAGE_NAME = buildGrpcPackageName(USER_GRPC_DOMAIN, PROTO_VERSIONS.V1);
export const USER_V1_GRPC_SERVICE_NAME = 'UserService';
export const USER_V1_FULL_SERVICE_NAME = `${USER_V1_GRPC_PACKAGE_NAME}.${USER_V1_GRPC_SERVICE_NAME}`;
export const USER_V1_GRPC_CLIENT = 'USER_V1_GRPC_CLIENT';

export const USER_V1_GRPC_METHODS = {
   CHECK_USERNAME: 'CheckUsername',
   GET_USER_BY_ID: 'GetUserById',
   GET_MY_PROFILE: 'GetMyProfile',
   GET_ALL_USERS: 'GetAllUsers',
   CREATE_PROFILE: 'CreateProfile',
   UPDATE_USER_PROFILE: 'UpdateUserProfile',
   UPDATE_USERNAME: 'UpdateUsername',
   DELETE_USER: 'DeleteUser',
   UPLOAD_AVATAR: 'UploadAvatar',
   GET_AVATAR_UPLOAD_SIGNATURE: 'GetAvatarUploadSignature',
   FOLLOW_USER: 'FollowUser',
   UNFOLLOW_USER: 'UnfollowUser',
   CHECK_IS_FOLLOWING: 'CheckIsFollowing',
   GET_FOLLOW_SUGGESTIONS: 'GetFollowSuggestions',
   GET_DATE_OF_BIRTH: 'GetDateOfBirth',
   SEARCH_USERS: 'SearchUsers',
   GET_FOLLOWERS: 'GetFollowers',
   GET_FOLLOWING: 'GetFollowing',
   GET_FOLLOWERS_COUNT: 'GetFollowersCount',
   GET_FOLLOWING_COUNT: 'GetFollowingCount',
   GET_MUTUAL_FOLLOWERS: 'GetMutualFollowers',
   ACCEPT_FOLLOW_REQUEST: 'AcceptFollowRequest',
   REJECT_FOLLOW_REQUEST: 'RejectFollowRequest',
   GET_USER_BY_ACCOUNT_ID: 'GetUserByAccountId',
   GET_USER_BY_USERNAME: 'GetUserByUsername',
   RESTORE_USER: 'RestoreUser',
   GET_USER_STATS: 'GetUserStats',
} as const;

export type UserV1GrpcMethod = (typeof USER_V1_GRPC_METHODS)[keyof typeof USER_V1_GRPC_METHODS];

/**
 * Returns the resolved file path to user.proto for the specified version (defaults to v1),
 * supporting both runtime dist and source locations.
 */
export function getUserProtoPath(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const filename = 'user.proto';
   const candidates = [
      path.resolve(__dirname, `../proto/${version}/${filename}`),
      path.resolve(__dirname, `../../proto/${version}/${filename}`),
      path.resolve(process.cwd(), `libs/contracts/user/src/proto/${version}/${filename}`),
      path.resolve(process.cwd(), `dist/libs/contracts/user/proto/${version}/${filename}`),
   ];

   for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
         return candidate;
      }
   }

   return candidates[0];
}

/**
 * Proto loader options interface matching @grpc/proto-loader configuration
 */
export interface UserProtoLoaderOptions {
   keepCase?: boolean;
   alternateCommentMode?: boolean;
   longs?: (value: unknown) => unknown;
   enums?: (value: unknown) => unknown;
   bytes?: (value: unknown) => unknown;
   defaults?: boolean;
   arrays?: boolean;
   objects?: boolean;
   oneofs?: boolean;
   json?: boolean;
   includeDirs?: string[];
}

/**
 * Returns the resolved directory path to the proto folder for the specified version (defaults to v1),
 * supporting both runtime dist and source locations for loader.includeDirs.
 */
export function getUserProtoDir(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const protoPath = getUserProtoPath(version);
   return path.dirname(protoPath);
}

/**
 * Returns standard proto loader options configured with includeDirs for modular proto resolution.
 */
export function getUserProtoLoaderOptions(version: ProtoVersion = DEFAULT_PROTO_VERSION): UserProtoLoaderOptions {
   return {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [getUserProtoDir(version)],
   };
}
