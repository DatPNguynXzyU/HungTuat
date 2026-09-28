import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { IDeviceInfo } from '@common/interfaces/auth.interface';

export class DeviceDetectorUtil {
   static parse(userAgent?: string, ipAddress?: string): IDeviceInfo {
      const ua = (userAgent || '').trim();
      const ip = (ipAddress || '127.0.0.1').trim();

      const parser = new UAParser(ua);
      const parsedUa = parser.getResult();

      const browserName = parsedUa.browser.name;
      const browserVersion = parsedUa.browser.major || parsedUa.browser.version;
      const browser = browserName ? `${browserName}${browserVersion ? ' ' + browserVersion : ''}` : 'Unknown Browser';

      const osName = parsedUa.os.name;
      const osVersion = parsedUa.os.version;
      const os = osName ? `${osName}${osVersion ? ' ' + osVersion : ''}` : 'Unknown OS';

      const rawDeviceType = parsedUa.device.type;
      let deviceType: string = rawDeviceType || 'desktop';
      if (!rawDeviceType) {
         if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) {
            deviceType = 'mobile';
         } else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
            deviceType = 'tablet';
         } else if (/bot|crawler|spider|curl|postman/i.test(ua)) {
            deviceType = 'bot';
         }
      }

      let deviceName = `${browserName || 'Browser'} on ${osName || 'Unknown OS'}`;
      if (parsedUa.device.vendor || parsedUa.device.model) {
         const model = [parsedUa.device.vendor, parsedUa.device.model].filter(Boolean).join(' ');
         deviceName = `${browserName || 'Browser'} on ${model}`;
      }

      let city: string | undefined;
      let region: string | undefined;
      let country: string | undefined;
      let countryCode: string | undefined;

      if (ip && !this.isPrivateIp(ip)) {
         try {
            const geo = geoip.lookup(ip);
            if (geo) {
               city = geo.city || undefined;
               region = geo.region || undefined;
               countryCode = geo.country || undefined;
               country = geo.country || undefined;
            }
         } catch {
            // Silently fallback if GeoIP database lookup fails
         }
      }

      return {
         deviceType,
         deviceName,
         browser,
         os,
         userAgent: ua,
         ipAddress: ip,
         city,
         region,
         country,
         countryCode,
      };
   }

   private static isPrivateIp(ip: string): boolean {
      return (
         ip === '127.0.0.1' ||
         ip === '::1' ||
         ip === 'localhost' ||
         ip.startsWith('10.') ||
         ip.startsWith('192.168.') ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
         ip.startsWith('fe80::') ||
         ip.startsWith('fc00::')
      );
   }
}
