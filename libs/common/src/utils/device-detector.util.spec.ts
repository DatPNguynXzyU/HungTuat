import { DeviceDetectorUtil } from '@common/utils/device-detector.util';

describe('DeviceDetectorUtil', () => {
   it('should parse desktop Chrome on macOS user-agent correctly', () => {
      const macChromeUa =
         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

      const result = DeviceDetectorUtil.parse(macChromeUa, '127.0.0.1');

      expect(result.deviceType).toBe('desktop');
      expect(result.browser).toContain('Chrome');
      expect(result.os).toMatch(/macOS|Mac OS/i);
      expect(result.ipAddress).toBe('127.0.0.1');
   });

   it('should parse mobile Safari on iPhone user-agent correctly', () => {
      const iphoneUa =
         'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

      const result = DeviceDetectorUtil.parse(iphoneUa, '14.169.80.25');

      expect(result.deviceType).toBe('mobile');
      expect(result.os).toContain('iOS');
      expect(result.ipAddress).toBe('14.169.80.25');
   });

   it('should handle empty or undefined user-agent gracefully', () => {
      const result = DeviceDetectorUtil.parse(undefined, undefined);

      expect(result.deviceType).toBe('desktop');
      expect(result.ipAddress).toBe('127.0.0.1');
   });

   it('should handle bot user-agent', () => {
      const botUa = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
      const result = DeviceDetectorUtil.parse(botUa, '66.249.66.1');

      expect(result.deviceType).toBe('bot');
   });
});
