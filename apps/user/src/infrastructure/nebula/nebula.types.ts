export interface NebulaExecutionResponse {
   errorCode: number;
   errorMessage: string;
   data: Record<string, unknown>[];
   columns?: string[];
   spaceName?: string;
   latencyInUs?: number;
}

export interface NebulaGraphClientConfig {
   address: string;
   port: number;
   username: string;
   password: string;
}

export interface NebulaSessionPoolConfig extends NebulaGraphClientConfig {
   spaceName: string;
   poolSize: number;
}

export interface NebulaGraphClient {
   close(): Promise<void>;
}

export interface NebulaSessionPool {
   init(): Promise<void>;
   close(): Promise<void>;
   execute(query: string): Promise<NebulaExecutionResponse>;
}
