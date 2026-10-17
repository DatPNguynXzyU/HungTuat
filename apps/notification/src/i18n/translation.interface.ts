/**
 * Base translation structure for type safety across all email templates.
 */
export interface CommonTranslations {
   brandName: string;
   copyright: string;
   autoEmailNotice: string;
   securityNotice?: string;
   support: string;
}

export interface WelcomeEmailTranslations {
   preview: string;
   badge: string;
   heading: string;
   body1: string;
   body2: string;
   ctaButton: string;
   supportText: string;
   signoff: string;
}

export interface OtpEmailTranslations {
   preview: string;
   badge: string;
   heading: string;
   greeting: string;
   body: string;
   otpLabel: string;
   expiryBadge: string;
   securityNoticeTitle: string;
   securityNoticeBody: string;
   disclaimerText: string;
}

export interface VerificationEmailTranslations {
   preview: string;
   badge: string;
   heading: string;
   greeting: string;
   body: string;
   ctaButton: string;
   orText: string;
   tokenLabel: string;
   disclaimerText: string;
}

export interface ResetPasswordEmailTranslations {
   preview: string;
   badge: string;
   heading: string;
   greeting: string;
   body: string;
   ctaButton: string;
   orText: string;
   tokenLabel: string;
   expiryNotice: string;
   securityText: string;
}

export interface ChangePasswordOtpEmailTranslations {
   preview: string;
   badge: string;
   heading: string;
   greeting: string;
   body: string;
   otpLabel: string;
   expiryBadge: string;
   securityNoticeTitle: string;
   securityNoticeBody: string;
   disclaimerText: string;
}

export interface BaseTranslations {
   common: CommonTranslations;
   welcome: WelcomeEmailTranslations;
   otp: OtpEmailTranslations;
   verification: VerificationEmailTranslations;
   resetPassword: ResetPasswordEmailTranslations;
   changePasswordOtp: ChangePasswordOtpEmailTranslations;
}

/**
 * Supported locales
 */
export enum Locale {
   EN = 'en',
   VI = 'vi',
   JA = 'ja',
}

/**
 * Translation service interface defining contract for translation management
 */
export interface ITranslationService {
   getTranslations(locale?: Locale | string): BaseTranslations;
   getSupportedLocales(): Locale[];
   isLocaleSupported(locale: string): boolean;
   interpolate(text: string, params: Record<string, string | number>): string;
}
