/**
 * User context for RabbitMQ messages - extracted from JWT token
 * Simpler version of IAuthUser focused on authorization context
 */
export interface IServiceMessageUser {
   /**
    * User ID from JWT sub claim
    */
   userId: string;

   /**
    * User email
    */
   email: string;

   /**
    * User roles for authorization
    */
   roles: string[];

   /**
    * User permissions for fine-grained authorization
    */
   permissions: string[];

   /**
    * Session ID from JWT jti claim (optional)
    */
   sessionId?: string;

   /**
    * Device ID for audit tracking (optional)
    */
   deviceId?: string;
}

/**
 * Generic wrapper for all RabbitMQ messages between Gateway and Microservices
 * Contains business payload and user context from JWT
 */
export interface IServiceMessage<T = unknown> {
   /**
    * Business payload - the actual data for the operation
    */
   data: T;

   /**
    * User context from JWT token (optional for public endpoints)
    * Contains userId, email, roles, permissions
    */
   user?: IServiceMessageUser;
}

export type ServiceMessage<T = unknown> = IServiceMessage<T>;
export type ServiceMessageUser = IServiceMessageUser;
