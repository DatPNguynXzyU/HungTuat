export class IngredientCreatedEvent {
   constructor(
      public readonly ingredientId: string,
      public readonly ingredientName: string,
      public readonly ingredientSlug: string,
      public readonly categoryId: string,
   ) {}
}

export class SupplierRegisteredEvent {
   constructor(
      public readonly supplierId: string,
      public readonly supplierName: string,
      public readonly supplierCode: string,
   ) {}
}

export class ProductOfferCreatedEvent {
   constructor(
      public readonly productId: string,
      public readonly supplierId: string,
      public readonly ingredientId: string,
      public readonly productSku: string,
      public readonly price: number,
   ) {}
}

export class ProductStockUpdatedEvent {
   constructor(
      public readonly productId: string,
      public readonly previousStock: number,
      public readonly newStock: number,
   ) {}
}
