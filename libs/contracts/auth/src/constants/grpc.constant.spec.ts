import * as fs from 'fs';
import * as path from 'path';
import * as protoLoader from '@grpc/proto-loader';
import {
   AUTH_GRPC_DOMAIN,
   AUTH_V1_GRPC_METHODS,
   AUTH_V1_GRPC_PACKAGE_NAME,
   AUTH_V1_GRPC_SERVICE_NAME,
   PROTO_VERSIONS,
   buildGrpcPackageName,
   getAuthProtoDir,
   getAuthProtoLoaderOptions,
   getAuthProtoPath,
} from '@contracts/auth/constants/grpc.constant';

describe('Auth gRPC Constants & Path Resolver', () => {
   it('should match the package declared inside auth.proto dynamically', () => {
      const protoPath = getAuthProtoPath(PROTO_VERSIONS.V1);
      const protoContent = fs.readFileSync(protoPath, 'utf8');
      const match = protoContent.match(/package\s+([^;]+);/);
      const declaredPackage = match ? match[1].trim() : '';

      expect(AUTH_V1_GRPC_PACKAGE_NAME).toBe(declaredPackage);
      expect(AUTH_V1_GRPC_SERVICE_NAME).toBe('AuthService');
   });

   it('should compose package name using domain and version tokens', () => {
      const expectedPackage = buildGrpcPackageName(AUTH_GRPC_DOMAIN, PROTO_VERSIONS.V1);
      expect(AUTH_V1_GRPC_PACKAGE_NAME).toBe(expectedPackage);
   });

   it('should resolve proto path dynamically for given version', () => {
      const v1Path = getAuthProtoPath(PROTO_VERSIONS.V1);
      expect(fs.existsSync(v1Path)).toBe(true);
      expect(v1Path).toContain(PROTO_VERSIONS.V1);

      const defaultPath = getAuthProtoPath();
      expect(defaultPath).toBe(v1Path);
   });

   it('should expose strongly-typed gRPC method constants', () => {
      expect(AUTH_V1_GRPC_METHODS.CHECK_EMAIL).toBe('CheckEmail');
      expect(AUTH_V1_GRPC_METHODS.LOGIN).toBe('Login');
      expect(AUTH_V1_GRPC_METHODS.REFRESH_TOKEN).toBe('RefreshToken');
   });

   it('should resolve base proto directory and find modular models and messages', () => {
      const protoDir = getAuthProtoDir(PROTO_VERSIONS.V1);
      expect(fs.existsSync(protoDir)).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/device.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/user.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'models/token.proto'))).toBe(true);
      expect(fs.existsSync(path.join(protoDir, 'messages/auth_messages.proto'))).toBe(true);
   });

   it('should provide default proto loader options configured with includeDirs', () => {
      const options = getAuthProtoLoaderOptions(PROTO_VERSIONS.V1);
      expect(options.keepCase).toBe(true);
      expect(options.longs).toBe(String);
      expect(options.enums).toBe(String);
      expect(options.defaults).toBe(true);
      expect(options.oneofs).toBe(true);
      expect(options.includeDirs).toBeDefined();
      expect(options.includeDirs).toContain(getAuthProtoDir(PROTO_VERSIONS.V1));
   });

   it('should successfully load modular proto contracts via @grpc/proto-loader', () => {
      const protoPath = getAuthProtoPath(PROTO_VERSIONS.V1);
      const loaderOptions = getAuthProtoLoaderOptions(PROTO_VERSIONS.V1);

      const packageDefinition = protoLoader.loadSync(protoPath, loaderOptions);
      expect(packageDefinition).toBeDefined();

      // Verify AuthService is resolved with modular messages
      const serviceKey = `${AUTH_V1_GRPC_PACKAGE_NAME}.${AUTH_V1_GRPC_SERVICE_NAME}`;
      expect(packageDefinition[serviceKey]).toBeDefined();

      // Verify modular models and messages are loaded into the package definition
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.CheckEmailRequest`]).toBeDefined();
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.LoginRequest`]).toBeDefined();
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.RefreshTokenRequest`]).toBeDefined();
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.RefreshTokenResponse`]).toBeDefined();
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.DeviceInfoProto`]).toBeDefined();
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.AuthUserProto`]).toBeDefined();
      expect(packageDefinition[`${AUTH_V1_GRPC_PACKAGE_NAME}.AuthTokensProto`]).toBeDefined();
   });
});
