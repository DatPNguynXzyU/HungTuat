import * as fs from 'fs';
import {
   HEALTH_GRPC_DOMAIN,
   HEALTH_GRPC_PACKAGE_NAME,
   HEALTH_GRPC_SERVICE_NAME,
   HEALTH_V1_GRPC_PACKAGE_NAME,
   HEALTH_V1_GRPC_SERVICE_NAME,
   PROTO_VERSIONS,
   buildGrpcPackageName,
   getHealthProtoPath,
} from '@contracts/health/constants/grpc.constant';

describe('Health gRPC Constants & Path Resolver', () => {
   it('should match the package declared inside health.proto dynamically', () => {
      const protoPath = getHealthProtoPath(PROTO_VERSIONS.V1);
      const protoContent = fs.readFileSync(protoPath, 'utf8');
      const match = protoContent.match(/package\s+([^;]+);/);
      const declaredPackage = match ? match[1].trim() : '';

      expect(HEALTH_V1_GRPC_PACKAGE_NAME).toBe(declaredPackage);
      expect(HEALTH_GRPC_PACKAGE_NAME).toBe(HEALTH_V1_GRPC_PACKAGE_NAME);
      expect(HEALTH_GRPC_SERVICE_NAME).toBe(HEALTH_V1_GRPC_SERVICE_NAME);
   });

   it('should compose package name using domain and version tokens', () => {
      const expectedPackage = buildGrpcPackageName(HEALTH_GRPC_DOMAIN, PROTO_VERSIONS.V1);
      expect(HEALTH_V1_GRPC_PACKAGE_NAME).toBe(expectedPackage);
   });

   it('should resolve proto path dynamically for given version', () => {
      const v1Path = getHealthProtoPath(PROTO_VERSIONS.V1);
      expect(fs.existsSync(v1Path)).toBe(true);
      expect(v1Path).toContain(PROTO_VERSIONS.V1);

      const defaultPath = getHealthProtoPath();
      expect(defaultPath).toBe(v1Path);
   });
});
