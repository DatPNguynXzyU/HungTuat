import { Injectable, Optional } from '@nestjs/common';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationConfigService } from '@notification/config';
import { Locale, TranslationService } from '@notification/i18n';
import {
   ChangePasswordOtpEmail,
   OtpEmail,
   ResetPasswordEmail,
   VerificationEmail,
   WelcomeEmail,
} from '@notification/templates';

@Injectable()
export class EmailTemplateService {
   constructor(
      private readonly translationService: TranslationService = new TranslationService(),
      @Optional() private readonly configService?: NotificationConfigService,
   ) {}

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

   private renderElement(element: React.ReactElement): { html: string; text: string } {
      const markup = renderToStaticMarkup(element);
      const html = markup.startsWith('<!DOCTYPE html>') ? markup : `<!DOCTYPE html>${markup}`;
      const text = this.htmlToPlainText(html);
      return { html, text };
   }

   renderWelcomeEmail(
      params: { fullName?: string; actionUrl?: string },
      locale: Locale | string = Locale.EN,
   ): { html: string; text: string } {
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

   renderVerificationEmail(
      params: { fullName?: string; verificationUrl?: string; token?: string },
      locale: Locale | string = Locale.EN,
   ): {
      html: string;
      text: string;
   } {
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
   ): {
      html: string;
      text: string;
   } {
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
   ): {
      html: string;
      text: string;
   } {
      const translations = this.translationService.getTranslations(locale);
      const element = React.createElement(OtpEmail, { ...params, translations });
      return this.renderElement(element);
   }

   renderChangePasswordOtpEmail(
      params: { fullName?: string; otpCode?: string; expiresInMinutes?: number },
      locale: Locale | string = Locale.EN,
   ): {
      html: string;
      text: string;
   } {
      const translations = this.translationService.getTranslations(locale);
      const element = React.createElement(ChangePasswordOtpEmail, { ...params, translations });
      return this.renderElement(element);
   }
}
