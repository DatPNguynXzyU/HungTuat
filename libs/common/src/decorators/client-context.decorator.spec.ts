import { DeviceDetectorUtil } from '@common/utils/device-detector.util';

describe('ClientContext Decorator Logic', () => {
   describe('Device info extraction', () => {
      it('should extract device info from standard web request headers', () => {
         const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
         const ipAddress = '192.168.1.100';

         const result = DeviceDetectorUtil.parse(userAgent, ipAddress);

         expect(result).toBeDefined();
         expect(result.userAgent).toContain('Mozilla');
         expect(result.ipAddress).toBe('192.168.1.100');
         expect(result.deviceType).toBeDefined();
      });

      it('should extract custom headers for mobile clients', () => {
         const userAgent = 'MyMobileApp/1.0';
         const headers = {
            'x-client-type': 'mobile',
            'x-device-id': 'device-uuid-12345',
            'x-device-name': 'iPhone 14 Pro',
            'x-app-version': '1.2.3',
         };

         const result = DeviceDetectorUtil.parse(userAgent, '127.0.0.1', headers);

         expect(result.clientType).toBe('mobile');
         expect(result.deviceId).toBe('device-uuid-12345');
         expect(result.deviceName).toBe('iPhone 14 Pro');
         expect(result.appVersion).toBe('1.2.3');
      });

      it('should handle x-forwarded-for header format', () => {
         const forwardedFor = '203.0.113.1, 192.168.1.1, 10.0.0.1';
         const firstIp = forwardedFor.split(',')[0]?.trim();

         expect(firstIp).toBe('203.0.113.1');

         const result = DeviceDetectorUtil.parse('test', firstIp || '127.0.0.1');
         expect(result.ipAddress).toBe('203.0.113.1');
      });

      it('should handle x-real-ip header', () => {
         const realIp = '203.0.113.5';

         const result = DeviceDetectorUtil.parse('test', realIp);
         expect(result.ipAddress).toBe('203.0.113.5');
      });

      it('should use fallback IP when none provided', () => {
         const result = DeviceDetectorUtil.parse('test', '127.0.0.1');
         expect(result.ipAddress).toBe('127.0.0.1');
      });

      it('should handle missing user-agent gracefully', () => {
         const result = DeviceDetectorUtil.parse('', '127.0.0.1');

         expect(result).toBeDefined();
         expect(result.userAgent).toBeDefined();
         expect(result.deviceType).toBeDefined();
      });

      it('should parse all custom header types correctly', () => {
         const headers = {
            'x-client-type': 'desktop',
            'x-device-id': 'desktop-uuid-789',
            'x-device-name': 'MacBook Pro',
            'x-app-version': '2.0.0',
         };

         const result = DeviceDetectorUtil.parse('test', '127.0.0.1', headers);

         expect(result.clientType).toBe('desktop');
         expect(result.deviceId).toBe('desktop-uuid-789');
         expect(result.deviceName).toBe('MacBook Pro');
         expect(result.appVersion).toBe('2.0.0');
      });
   });
});
