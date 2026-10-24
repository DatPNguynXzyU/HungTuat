export interface IJsonWebKey {
   kty: string;
   use?: string;
   alg?: string;
   kid?: string;
   crv?: string;
   x?: string;
   y?: string;
   n?: string;
   e?: string;
   [key: string]: unknown;
}

export interface IJwksResponse {
   keys: IJsonWebKey[];
}
