export interface IGrpcMetricsCallParams {
   service: string;
   method: string;
   status: string;
   durationSeconds: number;
}

export interface IGrpcMetricsCollector {
   recordGrpcCall(params: IGrpcMetricsCallParams): void;
}

export const GRPC_METRICS_COLLECTOR = Symbol('GRPC_METRICS_COLLECTOR');
