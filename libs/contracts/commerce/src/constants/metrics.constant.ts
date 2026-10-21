export const COMMERCE_METRICS_PREFIX = 'commerce_';

export const COMMERCE_METRICS_NAMES = {
   GRPC_REQUESTS: 'commerce_grpc_requests_total',
   GRPC_REQUEST_DURATION: 'commerce_grpc_request_duration_seconds',
   OPERATIONS: 'commerce_operations_total',
} as const;

export const COMMERCE_METRICS_HELP = {
   GRPC_REQUESTS: 'Total gRPC requests handled by Commerce service',
   GRPC_REQUEST_DURATION: 'gRPC request latency in seconds',
   OPERATIONS: 'Total domain operations in Commerce service',
} as const;

export const COMMERCE_METRICS_LABELS = {
   SERVICE: 'service',
   METHOD: 'method',
   STATUS: 'status',
   OPERATION: 'operation',
} as const;

export const COMMERCE_METRICS_BUCKETS = {
   GRPC_REQUEST_DURATION: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
} as const;

export const COMMERCE_METRICS_STATUS = {
   SUCCESS: 'success',
   FAILURE: 'failure',
} as const;

export type CommerceMetricStatus = (typeof COMMERCE_METRICS_STATUS)[keyof typeof COMMERCE_METRICS_STATUS];

export const COMMERCE_METRICS_OPERATIONS = {
   CREATE_INGREDIENT: 'create_ingredient',
   REGISTER_SUPPLIER: 'register_supplier',
   CREATE_PRODUCT_OFFER: 'create_product_offer',
   UPDATE_STOCK: 'update_stock',
   VALIDATE_INGREDIENTS: 'validate_ingredients',
} as const;

export type CommerceMetricOperation = (typeof COMMERCE_METRICS_OPERATIONS)[keyof typeof COMMERCE_METRICS_OPERATIONS];
