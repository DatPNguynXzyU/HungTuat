export const CONTEXT_TYPES = {
   HTTP: 'http',
   RPC: 'rpc',
   WS: 'ws',
} as const;

export type ContextTypeKind = (typeof CONTEXT_TYPES)[keyof typeof CONTEXT_TYPES];
