import { Locale, TranslationService } from '@notification/i18n';

describe('TranslationService', () => {
   let service: TranslationService;

   beforeEach(() => {
      service = new TranslationService();
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should return supported locales', () => {
      const locales = service.getSupportedLocales();
      expect(locales).toContain(Locale.EN);
      expect(locales).toContain(Locale.VI);
   });

   it('should check if locale is supported', () => {
      expect(service.isLocaleSupported('en')).toBe(true);
      expect(service.isLocaleSupported('vi')).toBe(true);
      expect(service.isLocaleSupported('fr')).toBe(false);
   });

   it('should load English translations', () => {
      const t = service.getTranslations(Locale.EN);
      expect(t).toBeDefined();
      expect(t.common.brandName).toBe('OmniServices');
      expect(t.welcome.badge).toBe('WELCOME ABOARD');
      expect(t.otp.badge).toBe('SECURITY VERIFICATION');
   });

   it('should load Vietnamese translations', () => {
      const t = service.getTranslations(Locale.VI);
      expect(t).toBeDefined();
      expect(t.common.brandName).toBe('OmniServices');
      expect(t.welcome.badge).toBe('CHÀO MỪNG');
      expect(t.otp.badge).toBe('XÁC MINH BẢO MẬT');
   });

   it('should fallback to English for unsupported locale', () => {
      const t = service.getTranslations('unknown-locale');
      expect(t.welcome.badge).toBe('WELCOME ABOARD');
   });

   it('should fallback to English when locale is undefined', () => {
      const t = service.getTranslations();
      expect(t.welcome.badge).toBe('WELCOME ABOARD');
   });

   it('should correctly interpolate parameters into text', () => {
      const template = 'Hello {name}, your code is {code}!';
      const result = service.interpolate(template, { name: 'Alice', code: 123456 });
      expect(result).toBe('Hello Alice, your code is 123456!');
   });

   it('should leave unknown placeholders untouched during interpolation', () => {
      const template = 'Hello {name}, your status is {status}!';
      const result = service.interpolate(template, { name: 'Bob' });
      expect(result).toBe('Hello Bob, your status is {status}!');
   });
});
