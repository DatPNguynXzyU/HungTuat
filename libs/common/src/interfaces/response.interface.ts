export interface IPaginationMeta {
   page: number;
   limit: number;
   total: number;
   totalPages: number;
   hasNext: boolean;
   hasPrev: boolean;
}

export interface IPaginatedData<T> {
   items: T[];
   meta: IPaginationMeta;
}

export interface IBaseResponse<T = unknown> {
   success: boolean;
   statusCode: number;
   message: string;
   data: T | null;
   meta?: IPaginationMeta;
   timestamp: string;
   correlationId?: string;
}

export interface IValidationErrorDetail {
   field: string;
   message: string;
   code?: string;
   params?: Record<string, unknown>;
}

export interface IErrorResponse {
   success: false;
   statusCode: number;
   message: string;
   error: string;
   errorCode?: string;
   params?: Record<string, unknown>;
   details?: unknown;
   errors?: IValidationErrorDetail[];
   path: string;
   method: string;
   timestamp: string;
   correlationId?: string;
}
