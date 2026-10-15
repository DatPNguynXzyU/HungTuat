import { AuditStatus } from '@auth/prisma-client';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';
import type { IBuilder, IDeviceInfo } from '@common';

/**
 * Fluent builder for constructing immutable audit log records.
 * Resolves the "Telescoping Constructor / Parameter Creep" code smell across authentication services,
 * encapsulating device info extraction, failure/success states, and metadata enrichment.
 */
export class AuditLogBuilder implements IBuilder<CreateAuditLogData> {
   private action?: string;
   private status: AuditStatus = AuditStatus.SUCCESS;
   private accountId?: string | null = null;
   private actorEmail?: string | null = null;
   private ipAddress?: string | null = null;
   private userAgent?: string | null = null;
   private deviceType?: string | null = null;
   private deviceName?: string | null = null;
   private browser?: string | null = null;
   private os?: string | null = null;
   private city?: string | null = null;
   private country?: string | null = null;
   private reason?: string | null = null;
   private metadata?: Record<string, unknown> | null = null;

   /**
    * Static factory method to instantiate a new AuditLogBuilder.
    */
   static create(): AuditLogBuilder {
      return new AuditLogBuilder();
   }

   /**
    * Sets the audit event action identifier.
    */
   withAction(action: string): this {
      this.action = action;
      return this;
   }

   /**
    * Sets the audit log status explicitly.
    */
   withStatus(status: AuditStatus): this {
      this.status = status;
      return this;
   }

   /**
    * Marks the audit event as SUCCESS.
    */
   asSuccess(): this {
      this.status = AuditStatus.SUCCESS;
      return this;
   }

   /**
    * Marks the audit event as FAILURE with an optional reason code/message.
    */
   asFailure(reason?: string | null): this {
      this.status = AuditStatus.FAILURE;
      if (reason !== undefined) {
         this.reason = reason;
      }
      return this;
   }

   /**
    * Sets the target account ID.
    */
   withAccountId(accountId?: string | null): this {
      this.accountId = accountId ?? null;
      return this;
   }

   /**
    * Sets the actor email address.
    */
   withActorEmail(actorEmail?: string | null): this {
      this.actorEmail = actorEmail ?? null;
      return this;
   }

   /**
    * Sets account information from an object or explicit id/email parameters.
    */
   withAccount(
      accountOrId?: { id?: string | null; email?: string | null } | string | null,
      actorEmail?: string | null,
   ): this {
      if (typeof accountOrId === 'object' && accountOrId !== null) {
         if (accountOrId.id !== undefined) this.accountId = accountOrId.id ?? null;
         if (accountOrId.email !== undefined) this.actorEmail = accountOrId.email ?? null;
      } else {
         if (accountOrId !== undefined) this.accountId = accountOrId ?? null;
         if (actorEmail !== undefined) this.actorEmail = actorEmail ?? null;
      }
      return this;
   }

   /**
    * Convenient setter for actor credentials (email and/or account ID).
    */
   withActor(actorEmail?: string | null, accountId?: string | null): this {
      if (actorEmail !== undefined) this.actorEmail = actorEmail ?? null;
      if (accountId !== undefined) this.accountId = accountId ?? null;
      return this;
   }

   /**
    * Extracts and maps telemetry from a parsed IDeviceInfo payload.
    * Does not overwrite explicitly set client IP or userAgent.
    */
   withDeviceInfo(deviceInfo?: IDeviceInfo | null): this {
      if (!deviceInfo) {
         return this;
      }
      if (deviceInfo.ipAddress && !this.ipAddress) {
         this.ipAddress = deviceInfo.ipAddress;
      }
      if (deviceInfo.userAgent && !this.userAgent) {
         this.userAgent = deviceInfo.userAgent;
      }
      if (deviceInfo.deviceType && !this.deviceType) {
         this.deviceType = deviceInfo.deviceType;
      }
      if (deviceInfo.deviceName && !this.deviceName) {
         this.deviceName = deviceInfo.deviceName;
      }
      if (deviceInfo.browser && !this.browser) {
         this.browser = deviceInfo.browser;
      }
      if (deviceInfo.os && !this.os) {
         this.os = deviceInfo.os;
      }
      if (deviceInfo.city && !this.city) {
         this.city = deviceInfo.city;
      }
      if (deviceInfo.country && !this.country) {
         this.country = deviceInfo.country;
      }
      return this;
   }

   /**
    * Sets the client IP address explicitly.
    */
   withIpAddress(ipAddress?: string | null): this {
      this.ipAddress = ipAddress ?? null;
      return this;
   }

   /**
    * Sets the user agent string explicitly.
    */
   withUserAgent(userAgent?: string | null): this {
      this.userAgent = userAgent ?? null;
      return this;
   }

   /**
    * Sets the device classification.
    */
   withDeviceType(deviceType?: string | null): this {
      this.deviceType = deviceType ?? null;
      return this;
   }

   /**
    * Sets the client hardware or model name.
    */
   withDeviceName(deviceName?: string | null): this {
      this.deviceName = deviceName ?? null;
      return this;
   }

   /**
    * Sets the browser name/engine.
    */
   withBrowser(browser?: string | null): this {
      this.browser = browser ?? null;
      return this;
   }

   /**
    * Sets the operating system.
    */
   withOs(os?: string | null): this {
      this.os = os ?? null;
      return this;
   }

   /**
    * Sets geographic location details (city and country).
    */
   withLocation(city?: string | null, country?: string | null): this {
      if (city !== undefined) this.city = city ?? null;
      if (country !== undefined) this.country = country ?? null;
      return this;
   }

   /**
    * Sets the failure or trigger reason.
    */
   withReason(reason?: string | null): this {
      this.reason = reason ?? null;
      return this;
   }

   /**
    * Merges or replaces the metadata dictionary.
    */
   withMetadata(metadata?: Record<string, unknown> | null): this {
      if (metadata) {
         this.metadata = { ...(this.metadata ?? {}), ...metadata };
      } else {
         this.metadata = metadata ?? null;
      }
      return this;
   }

   /**
    * Appends a key-value pair to the metadata dictionary.
    */
   addMetadata(key: string, value: unknown): this {
      this.metadata = {
         ...(this.metadata ?? {}),
         [key]: value,
      };
      return this;
   }

   /**
    * Builds and validates the final CreateAuditLogData object.
    * @throws Error if mandatory properties like `action` are missing.
    */
   build(): CreateAuditLogData {
      if (!this.action) {
         throw new Error('AuditLogBuilder: "action" is required to build CreateAuditLogData');
      }

      return {
         action: this.action,
         status: this.status,
         accountId: this.accountId,
         actorEmail: this.actorEmail,
         ipAddress: this.ipAddress,
         userAgent: this.userAgent,
         deviceType: this.deviceType,
         deviceName: this.deviceName,
         browser: this.browser,
         os: this.os,
         city: this.city,
         country: this.country,
         reason: this.reason,
         metadata: this.metadata,
      };
   }
}
