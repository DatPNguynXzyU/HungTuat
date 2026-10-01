import { DeviceDetectorUtil } from './device-detector.util';

describe('DeviceDetectorUtil', () => {
   describe('parse', () => {
      it('should parse standard desktop browser user agent', () => {
         const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('desktop');
         expect(result.browser).toContain('Chrome');
         expect(result.os).toContain('macOS');
         expect(result.userAgent).toBe(ua);
         expect(result.ipAddress).toBe('127.0.0.1');
      });

      it('should parse mobile user agent (iPhone)', () => {
         const ua =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('mobile');
         expect(result.os).toContain('iOS');
      });

      it('should detect Flutter/Dart mobile clients', () => {
         const ua = 'Dart/3.0 (dart:io)';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('mobile');
      });

      it('should detect React Native clients', () => {
         const ua = 'MyApp/1.0 React Native';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('mobile');
      });

      it('should detect OkHttp (Android) clients', () => {
         const ua = 'okhttp/4.10.0';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('mobile');
      });

      it('should detect CFNetwork (iOS) clients', () => {
         const ua = 'MyApp/1.0 CFNetwork/1408.0.4 Darwin/22.5.0';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('mobile');
      });

      it('should detect Expo clients', () => {
         const ua = 'Expo/49.0.0 (iPhone; iOS 16.0; Scale/3.00)';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('mobile');
      });

      it('should detect bot user agents', () => {
         const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1');

         expect(result.deviceType).toBe('bot');
      });

      it('should parse custom headers for multi-platform support', () => {
         const ua = 'MyMobileApp/1.0';
         const headers = {
            'x-client-type': 'mobile',
            'x-device-id': 'device-uuid-12345',
            'x-device-name': 'iPhone 14 Pro',
            'x-app-version': '1.2.3',
         };

         const result = DeviceDetectorUtil.parse(ua, '192.168.1.100', headers);

         expect(result.clientType).toBe('mobile');
         expect(result.deviceId).toBe('device-uuid-12345');
         expect(result.deviceName).toBe('iPhone 14 Pro');
         expect(result.appVersion).toBe('1.2.3');
      });

      it('should handle invalid client type header gracefully', () => {
         const ua = 'MyApp/1.0';
         const headers = {
            'x-client-type': 'invalid-type',
         };

         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1', headers);

         expect(result.clientType).toBeUndefined();
      });

      it('should normalize valid client types', () => {
         const testCases: Array<{ input: string; expected: 'web' | 'mobile' | 'desktop' }> = [
            { input: 'web', expected: 'web' },
            { input: 'Web', expected: 'web' },
            { input: 'WEB', expected: 'web' },
            { input: 'mobile', expected: 'mobile' },
            { input: 'Mobile', expected: 'mobile' },
            { input: 'desktop', expected: 'desktop' },
            { input: 'Desktop', expected: 'desktop' },
         ];

         testCases.forEach(({ input, expected }) => {
            const headers = { 'x-client-type': input };
            const result = DeviceDetectorUtil.parse('test', '127.0.0.1', headers);
            expect(result.clientType).toBe(expected);
         });
      });

      it('should handle empty or missing user agent', () => {
         const result = DeviceDetectorUtil.parse('', '127.0.0.1');

         expect(result.userAgent).toBe('');
         expect(result.ipAddress).toBe('127.0.0.1');
         expect(result.deviceType).toBeDefined();
      });

      it('should handle private IP addresses', () => {
         const privateIps = ['127.0.0.1', '::1', '10.0.0.1', '192.168.1.1', '172.16.0.1'];

         privateIps.forEach((ip) => {
            const result = DeviceDetectorUtil.parse('test', ip);
            expect(result.city).toBeUndefined();
            expect(result.country).toBeUndefined();
         });
      });

      it('should override deviceName with custom header', () => {
         const ua = 'Mozilla/5.0 (iPhone)';
         const headers = {
            'x-device-name': 'Custom Device Name',
         };

         const result = DeviceDetectorUtil.parse(ua, '127.0.0.1', headers);

         expect(result.deviceName).toBe('Custom Device Name');
      });

      it('should return all required IDeviceInfo fields', () => {
         const result = DeviceDetectorUtil.parse('test', '127.0.0.1');

         expect(result).toHaveProperty('deviceType');
         expect(result).toHaveProperty('deviceName');
         expect(result).toHaveProperty('browser');
         expect(result).toHaveProperty('os');
         expect(result).toHaveProperty('userAgent');
         expect(result).toHaveProperty('ipAddress');
      });
   });
});
