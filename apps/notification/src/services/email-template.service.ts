import { Injectable } from '@nestjs/common';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OtpEmail, ResetPasswordEmail, VerificationEmail, WelcomeEmail } from '@notification/templates';

@Injectable()
export class EmailTemplateService {
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

   renderWelcomeEmail(params: { fullName?: string; actionUrl?: string }): { html: string; text: string } {
      const element = React.createElement(WelcomeEmail, params);
      return this.renderElement(element);
   }

   renderVerificationEmail(params: { fullName?: string; verificationUrl?: string; token?: string }): {
      html: string;
      text: string;
   } {
      const element = React.createElement(VerificationEmail, params);
      return this.renderElement(element);
   }

   renderResetPasswordEmail(params: { fullName?: string; resetUrl?: string; token?: string }): {
      html: string;
      text: string;
   } {
      const element = React.createElement(ResetPasswordEmail, params);
      return this.renderElement(element);
   }

   renderOtpEmail(params: { fullName?: string; otpCode?: string; expiresInMinutes?: number }): {
      html: string;
      text: string;
   } {
      const element = React.createElement(OtpEmail, params);
      return this.renderElement(element);
   }
}
