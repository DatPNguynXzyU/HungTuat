import * as fs from 'fs';
import {
   USER_GRPC_DOMAIN,
   USER_V1_GRPC_PACKAGE_NAME,
   USER_V1_GRPC_SERVICE_NAME,
   PROTO_VERSIONS,
   buildGrpcPackageName,
   getUserProtoPath,
} from '@contracts/user/constants/grpc.constant';

describe('User gRPC Constants & Path Resolver', () => {
   it('should match the package declared inside user.proto dynamically', () => {
      const protoPath = getUserProtoPath(PROTO_VERSIONS.V1);
      const protoContent = fs.readFileSync(protoPath, 'utf8');
      const match = protoContent.match(/package\s+([^;]+);/);
      const declaredPackage = match ? match[1].trim() : '';

      expect(USER_V1_GRPC_PACKAGE_NAME).toBe(declaredPackage);
      expect(USER_V1_GRPC_SERVICE_NAME).toBe('UserService');
   });

   it('should compose package name using domain and version tokens', () => {
      const expectedPackage = buildGrpcPackageName(USER_GRPC_DOMAIN, PROTO_VERSIONS.V1);
      expect(USER_V1_GRPC_PACKAGE_NAME).toBe(expectedPackage);
   });

   it('should resolve proto path dynamically for given version', () => {
      const v1Path = getUserProtoPath(PROTO_VERSIONS.V1);
      expect(fs.existsSync(v1Path)).toBe(true);
      expect(v1Path).toContain(PROTO_VERSIONS.V1);

      const defaultPath = getUserProtoPath();
      expect(defaultPath).toBe(v1Path);
   });
});
