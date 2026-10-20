export interface ICheckEmailRequest {
   email: string;
}

export interface ICheckEmailResponse {
   available: boolean;
   email: string;
}

// Aliases for compatibility
export type ICheckEmailRequestV1 = ICheckEmailRequest;
export type ICheckEmailResponseV1 = ICheckEmailResponse;
