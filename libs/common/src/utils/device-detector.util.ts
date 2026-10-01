import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { IDeviceInfo } from '@common/interfaces/auth.interface';

export interface DeviceHeaders {
   userAgent?: string;
   'x-client-type'?: string;
   'x-device-id'?: string;
   'x-device-name'?: string;
   'x-app-version'?: string;
}

export class DeviceDetectorUtil {
   static parse(userAgent?: string, ipAddress?: string, headers?: DeviceHeaders): IDeviceInfo {
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

      // Enhanced mobile client detection
      if (!rawDeviceType) {
         if (this.isMobileUserAgent(ua)) {
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

      // Extract custom headers for multi-platform support
      const deviceId = headers?.['x-device-id'];
      const clientType = this.parseClientType(headers?.['x-client-type']);
      const appVersion = headers?.['x-app-version'];
      const customDeviceName = headers?.['x-device-name'];

      // Override deviceName if custom header provided
      if (customDeviceName) {
         deviceName = customDeviceName;
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
         deviceId,
         clientType,
         appVersion,
      };
   }

   private static isMobileUserAgent(ua: string): boolean {
      // Enhanced mobile detection for various mobile frameworks and clients
      const mobilePatterns = [
         /mobile|iphone|ipod|android.*mobile/i,
         /dart\/[\d.]+/i, // Dart/Flutter
         /flutter/i, // Flutter
         /react.*native/i, // React Native
         /okhttp/i, // OkHttp (Android)
         /cfnetwork/i, // CFNetwork (iOS)
         /expo/i, // Expo
         /capacitor/i, // Capacitor
         /cordova/i, // Cordova
         /ionic/i, // Ionic
      ];

      return mobilePatterns.some((pattern) => pattern.test(ua));
   }

   private static parseClientType(clientType?: string): 'web' | 'mobile' | 'desktop' | undefined {
      if (!clientType) return undefined;

      const normalized = clientType.toLowerCase().trim();
      if (normalized === 'web' || normalized === 'mobile' || normalized === 'desktop') {
         return normalized;
      }

      return undefined;
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
