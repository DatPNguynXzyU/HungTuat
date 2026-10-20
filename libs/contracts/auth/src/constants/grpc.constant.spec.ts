import * as fs from 'fs';
import {
   AUTH_GRPC_DOMAIN,
   AUTH_V1_GRPC_PACKAGE_NAME,
   AUTH_V1_GRPC_SERVICE_NAME,
   PROTO_VERSIONS,
   buildGrpcPackageName,
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
});
