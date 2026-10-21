import * as fs from 'fs';
import * as path from 'path';
import * as protoLoader from '@grpc/proto-loader';
import {
   COMMERCE_GRPC_DOMAIN,
   COMMERCE_V1_GRPC_METHODS,
   COMMERCE_V1_GRPC_PACKAGE_NAME,
   COMMERCE_V1_GRPC_SERVICE_NAME,
   PROTO_VERSIONS,
   buildGrpcPackageName,
   getCommerceProtoDir,
   getCommerceProtoLoaderOptions,
   getCommerceProtoPath,
} from '@contracts/commerce/constants/grpc.constant';

describe('Commerce gRPC Constants & Path Resolver', () => {
   it('should match the package declared inside commerce.proto dynamically', () => {
      const protoPath = getCommerceProtoPath(PROTO_VERSIONS.V1);
      const protoContent = fs.readFileSync(protoPath, 'utf8');
      const match = protoContent.match(/package\s+([^;]+);/);
      const declaredPackage = match ? match[1].trim() : '';

      expect(COMMERCE_V1_GRPC_PACKAGE_NAME).toBe(declaredPackage);
      expect(COMMERCE_V1_GRPC_SERVICE_NAME).toBe('CommerceService');
   });

   it('should compose package name using domain and version tokens', () => {
      const expectedPackage = buildGrpcPackageName(COMMERCE_GRPC_DOMAIN, PROTO_VERSIONS.V1);
      expect(COMMERCE_V1_GRPC_PACKAGE_NAME).toBe(expectedPackage);
   });

   it('should resolve proto path dynamically for given version', () => {
      const v1Path = getCommerceProtoPath(PROTO_VERSIONS.V1);
      expect(fs.existsSync(v1Path)).toBe(true);
      expect(v1Path).toContain(PROTO_VERSIONS.V1);

      const defaultPath = getCommerceProtoPath();
      expect(defaultPath).toBe(v1Path);
   });

   it('should expose strongly-typed gRPC method constants', () => {
      expect(COMMERCE_V1_GRPC_METHODS.GET_INGREDIENT_BY_ID).toBe('GetIngredientById');
      expect(COMMERCE_V1_GRPC_METHODS.GET_SUPPLIERS_BY_INGREDIENT).toBe('GetSuppliersByIngredient');
      expect(COMMERCE_V1_GRPC_METHODS.VALIDATE_INGREDIENTS).toBe('ValidateIngredients');
      expect(COMMERCE_V1_GRPC_METHODS.LIST_CATEGORIES).toBe('ListCategories');
      expect(COMMERCE_V1_GRPC_METHODS.CREATE_INGREDIENT).toBe('CreateIngredient');
      expect(COMMERCE_V1_GRPC_METHODS.CREATE_SUPPLIER_PRODUCT).toBe('CreateSupplierProduct');
   });

   it('should resolve base proto directory and find modular models and messages', () => {
      const protoDir = getCommerceProtoDir(PROTO_VERSIONS.V1);
      expect(fs.existsSync(protoDir)).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/category.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/ingredient.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/supplier.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/product.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'messages/commerce_messages.proto'))).toBe(true);
   });

   it('should provide default proto loader options configured with includeDirs', () => {
      const options = getCommerceProtoLoaderOptions(PROTO_VERSIONS.V1);
      expect(options.keepCase).toBe(true);
      expect(options.longs).toBe(String);
      expect(options.enums).toBe(String);
      expect(options.defaults).toBe(true);
      expect(options.oneofs).toBe(true);
      expect(options.includeDirs).toBeDefined();
      expect(options.includeDirs).toContain(getCommerceProtoDir(PROTO_VERSIONS.V1));
   });

   it('should successfully load modular proto contracts via @grpc/proto-loader', () => {
      const protoPath = getCommerceProtoPath(PROTO_VERSIONS.V1);
      const loaderOptions = getCommerceProtoLoaderOptions(PROTO_VERSIONS.V1);

      const packageDefinition = protoLoader.loadSync(protoPath, loaderOptions);
      expect(packageDefinition).toBeDefined();

      const serviceKey = `${COMMERCE_V1_GRPC_PACKAGE_NAME}.${COMMERCE_V1_GRPC_SERVICE_NAME}`;
      expect(packageDefinition[serviceKey]).toBeDefined();

      expect(packageDefinition[`${COMMERCE_V1_GRPC_PACKAGE_NAME}.IngredientProto`]).toBeDefined();
      expect(packageDefinition[`${COMMERCE_V1_GRPC_PACKAGE_NAME}.SupplierProto`]).toBeDefined();
      expect(packageDefinition[`${COMMERCE_V1_GRPC_PACKAGE_NAME}.SupplierProductProto`]).toBeDefined();
   });
});
