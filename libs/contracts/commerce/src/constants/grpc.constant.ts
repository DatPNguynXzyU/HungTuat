import * as fs from 'fs';
import * as path from 'path';

export const COMMERCE_GRPC_DOMAIN = 'commerce';

export const PROTO_VERSIONS = {
   V1: 'v1',
   V2: 'v2',
} as const;

export type ProtoVersion = (typeof PROTO_VERSIONS)[keyof typeof PROTO_VERSIONS];
export const DEFAULT_PROTO_VERSION: ProtoVersion = PROTO_VERSIONS.V1;

/**
 * Builds standard gRPC package name: <domain>.<version> (e.g. commerce.v1)
 */
export function buildGrpcPackageName(domain: string, version: ProtoVersion): string {
   return `${domain}.${version}`;
}

// Version 1 Constants (Active & Default)
export const COMMERCE_V1_GRPC_PACKAGE_NAME = buildGrpcPackageName(COMMERCE_GRPC_DOMAIN, PROTO_VERSIONS.V1);
export const COMMERCE_V1_GRPC_SERVICE_NAME = 'CommerceService';
export const COMMERCE_V1_FULL_SERVICE_NAME = `${COMMERCE_V1_GRPC_PACKAGE_NAME}.${COMMERCE_V1_GRPC_SERVICE_NAME}`;
export const COMMERCE_V1_GRPC_CLIENT = 'COMMERCE_V1_GRPC_CLIENT';

export const COMMERCE_V1_GRPC_METHODS = {
   GET_INGREDIENT_BY_ID: 'GetIngredientById',
   GET_SUPPLIERS_BY_INGREDIENT: 'GetSuppliersByIngredient',
   VALIDATE_INGREDIENTS: 'ValidateIngredients',
   LIST_CATEGORIES: 'ListCategories',
   CREATE_INGREDIENT: 'CreateIngredient',
   REGISTER_SUPPLIER: 'RegisterSupplier',
   CREATE_SUPPLIER_PRODUCT: 'CreateSupplierProduct',
} as const;

export type CommerceV1GrpcMethod = (typeof COMMERCE_V1_GRPC_METHODS)[keyof typeof COMMERCE_V1_GRPC_METHODS];

/**
 * Returns the resolved file path to commerce.proto for the specified version (defaults to v1),
 * supporting runtime dist, local development, and fallback paths.
 */
export function getCommerceProtoPath(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const filename = 'commerce.proto';
   const candidates = [
      path.resolve(__dirname, `../proto/${version}/${filename}`),
      path.resolve(__dirname, `../../proto/${version}/${filename}`),
      path.resolve(process.cwd(), `libs/contracts/commerce/src/proto/${version}/${filename}`),
      path.resolve(process.cwd(), `dist/libs/contracts/commerce/proto/${version}/${filename}`),
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
export interface CommerceProtoLoaderOptions {
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
export function getCommerceProtoDir(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const protoPath = getCommerceProtoPath(version);
   return path.dirname(protoPath);
}

/**
 * Returns standard proto loader options configured with includeDirs for modular proto resolution.
 */
export function getCommerceProtoLoaderOptions(
   version: ProtoVersion = DEFAULT_PROTO_VERSION,
): CommerceProtoLoaderOptions {
   return {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [getCommerceProtoDir(version)],
   };
}
