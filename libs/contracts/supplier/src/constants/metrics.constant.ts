export const SUPPLIER_METRICS_PREFIX = 'supplier_';

export const SUPPLIER_METRICS_NAMES = {
   GRPC_REQUESTS: 'supplier_grpc_requests_total',
   GRPC_REQUEST_DURATION: 'supplier_grpc_request_duration_seconds',
   OPERATIONS: 'supplier_operations_total',
} as const;

export const SUPPLIER_METRICS_HELP = {
   GRPC_REQUESTS: 'Total gRPC requests handled by Supplier service',
   GRPC_REQUEST_DURATION: 'gRPC request latency in seconds',
   OPERATIONS: 'Total domain operations in Supplier service',
} as const;

export const SUPPLIER_METRICS_LABELS = {
   SERVICE: 'service',
   METHOD: 'method',
   STATUS: 'status',
   OPERATION: 'operation',
} as const;

export const SUPPLIER_METRICS_BUCKETS = {
   GRPC_REQUEST_DURATION: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
} as const;

export const SUPPLIER_METRICS_STATUS = {
   SUCCESS: 'success',
   FAILURE: 'failure',
} as const;

export type SupplierMetricStatus = (typeof SUPPLIER_METRICS_STATUS)[keyof typeof SUPPLIER_METRICS_STATUS];

export const SUPPLIER_METRICS_OPERATIONS = {
   REGISTER_SUPPLIER: 'register_supplier',
   UPDATE_SUPPLIER: 'update_supplier',
   VERIFY_SUPPLIER: 'verify_supplier',
} as const;

export type SupplierMetricOperation = (typeof SUPPLIER_METRICS_OPERATIONS)[keyof typeof SUPPLIER_METRICS_OPERATIONS];
