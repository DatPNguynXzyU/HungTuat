import { Injectable, Optional } from '@nestjs/common';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_TEMPLATES } from '@contracts/notification';
import { NotificationConfigService } from '@notification/config';
import { Locale, TranslationService } from '@notification/i18n';
import {
   ChangePasswordOtpEmail,
   OtpEmail,
   ResetPasswordEmail,
   SupplierWelcomeEmail,
   VerificationEmail,
   WelcomeEmail,
} from '@notification/templates';

export interface TemplateRenderResult {
   html: string;
   text: string;
   subject?: string;
}

/**
 * Strategy interface for rendering email templates adhering to the GoF Strategy Pattern.
 */
export interface IEmailTemplateStrategy {
   readonly template: string;
   render(params: Record<string, unknown>, locale?: Locale | string): TemplateRenderResult;
}

@Injectable()
export class EmailTemplateService {
   private readonly strategyRegistry = new Map<
      string,
      (params: Record<string, unknown>, locale?: Locale | string) => TemplateRenderResult
   >();

   constructor(
      private readonly translationService: TranslationService = new TranslationService(),
      @Optional() private readonly configService?: NotificationConfigService,
   ) {
      this.registerStrategies();
   }

   private registerStrategies(): void {
      this.strategyRegistry.set(NOTIFICATION_TEMPLATES.WELCOME_EMAIL, (params, locale) =>
         this.renderWelcomeEmail(params, locale),
      );
      this.strategyRegistry.set(NOTIFICATION_TEMPLATES.SUPPLIER_WELCOME_EMAIL, (params, locale) =>
         this.renderSupplierWelcomeEmail(params, locale),
      );
      this.strategyRegistry.set(NOTIFICATION_TEMPLATES.VERIFICATION_EMAIL, (params, locale) =>
         this.renderVerificationEmail(params, locale),
      );
      this.strategyRegistry.set(NOTIFICATION_TEMPLATES.RESET_PASSWORD_EMAIL, (params, locale) =>
         this.renderResetPasswordEmail(params, locale),
      );
      this.strategyRegistry.set(NOTIFICATION_TEMPLATES.OTP_EMAIL, (params, locale) =>
         this.renderOtpEmail(params, locale),
      );
      this.strategyRegistry.set(NOTIFICATION_TEMPLATES.CHANGE_PASSWORD_OTP_EMAIL, (params, locale) =>
         this.renderChangePasswordOtpEmail(params, locale),
      );
   }

   private htmlToPlainText(html: string): string {
      return html
         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
         .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
         .replace(/<br\s*\/?>/gi, '\n')
         .replace(/<\/p>/gi, '\n\n')
         .replace(/<\/h[1-6]>/gi, '\n\n')
         .replace(/<\/div>/gi, '\n')
         .replace(/<[^>]+>/g, '')
         .replace(/&nbsp;/g, ' ')
         .replace(/&copy;/g, '©')
         .replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/\n\s+\n/g, '\n\n')
         .replace(/\n{3,}/g, '\n\n')
         .trim();
   }

   private renderElement(element: React.ReactElement): TemplateRenderResult {
      const markup = renderToStaticMarkup(element);
      const html = markup.startsWith('<!DOCTYPE html>') ? markup : `<!DOCTYPE html>${markup}`;
      const text = this.htmlToPlainText(html);
      return { html, text };
   }

   /**
    * Strategy Pattern context dispatcher to render templates by name.
    */
   renderTemplate(
      templateName: string,
      data: Record<string, unknown> = {},
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const strategy = this.strategyRegistry.get(templateName);
      if (strategy) {
         return strategy(data, locale);
      }
      const fallbackText =
         typeof data.text === 'string'
            ? data.text
            : typeof data.subject === 'string'
              ? data.subject
              : 'OmniServices Notification';
      return {
         html: `<p>${fallbackText}</p>`,
         text: fallbackText,
      };
   }

   renderWelcomeEmail(
      params: { fullName?: string; actionUrl?: string },
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const translations = this.translationService.getTranslations(locale);
      const baseUrl = this.configService?.appUrl ?? 'https://zeion.online';
      const actionUrl = params.actionUrl || baseUrl;
      const element = React.createElement(WelcomeEmail, {
         ...params,
         actionUrl,
         translations,
      });
      return this.renderElement(element);
   }

   renderSupplierWelcomeEmail(
      params: { fullName?: string; supplierName?: string; actionUrl?: string },
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const translations = this.translationService.getTranslations(locale);
      const baseUrl = this.configService?.appUrl ?? 'https://zeion.online';
      const actionUrl = params.actionUrl || `${baseUrl}/supplier`;
      const element = React.createElement(SupplierWelcomeEmail, {
         ...params,
         actionUrl,
         translations,
      });
      const rendered = this.renderElement(element);
      return {
         ...rendered,
         subject: translations.supplierWelcome.subject || NOTIFICATION_EMAIL_SUBJECTS.SUPPLIER_WELCOME,
      };
   }

   renderVerificationEmail(
      params: { fullName?: string; verificationUrl?: string; token?: string },
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const translations = this.translationService.getTranslations(locale);
      const baseUrl = this.configService?.appUrl ?? 'https://zeion.online';
      const verificationUrl = params.verificationUrl || `${baseUrl}/verify`;
      const element = React.createElement(VerificationEmail, {
         ...params,
         verificationUrl,
         translations,
      });
      return this.renderElement(element);
   }

   renderResetPasswordEmail(
      params: { fullName?: string; resetUrl?: string; token?: string },
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const translations = this.translationService.getTranslations(locale);
      const baseUrl = this.configService?.appUrl ?? 'https://zeion.online';
      const resetUrl = params.resetUrl || `${baseUrl}/reset-password`;
      const element = React.createElement(ResetPasswordEmail, {
         ...params,
         resetUrl,
         translations,
      });
      return this.renderElement(element);
   }

   renderOtpEmail(
      params: { fullName?: string; otpCode?: string; expiresInMinutes?: number },
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const translations = this.translationService.getTranslations(locale);
      const element = React.createElement(OtpEmail, { ...params, translations });
      return this.renderElement(element);
   }

   renderChangePasswordOtpEmail(
      params: { fullName?: string; otpCode?: string; expiresInMinutes?: number },
      locale: Locale | string = Locale.EN,
   ): TemplateRenderResult {
      const translations = this.translationService.getTranslations(locale);
      const element = React.createElement(ChangePasswordOtpEmail, { ...params, translations });
      return this.renderElement(element);
   }
}
