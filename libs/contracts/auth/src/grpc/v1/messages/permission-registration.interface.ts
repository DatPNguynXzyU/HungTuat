export interface IPermissionDefinition {
   code: string;
   name: string;
   description?: string;
}

export interface IRegisterServicePermissionsRequest {
   serviceName?: string;
   service_name?: string;
   permissions: IPermissionDefinition[];
}

export interface IRegisterServicePermissionsResponse {
   success: boolean;
   upsertedCount?: number;
   upserted_count?: number;
}
