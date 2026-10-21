export class SupplierStatusChangedEvent {
   constructor(
      public readonly supplierId: string,
      public readonly previousStatus: string,
      public readonly newStatus: string,
   ) {}
}
