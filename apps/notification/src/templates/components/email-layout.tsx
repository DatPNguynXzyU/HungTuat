import React, { type FC, type ReactNode } from 'react';
import { Body, Container, Head, Hr, Html, Preview } from '@react-email/components';
import { EMAIL_COLORS, EMAIL_FONTS } from '@notification/constants/email-theme';
import { CommonTranslations } from '@notification/i18n';
import { EmailFooter } from '@notification/templates/components/email-footer';

export interface EmailLayoutProps {
   preview: string;
   children: ReactNode;
   common: CommonTranslations;
   isSecurityEmail?: boolean;
}

export const EmailLayout: FC<EmailLayoutProps> = ({ preview, children, common, isSecurityEmail = false }) => {
   return (
      <Html>
         <Head />
         <Preview>{preview}</Preview>
         <Body style={main}>
            <Container style={container}>
               <div style={accentBar} />
               {children}
               <Hr style={hr} />
               <EmailFooter common={common} isSecurityEmail={isSecurityEmail} />
            </Container>
         </Body>
      </Html>
   );
};

export default EmailLayout;

const main: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.bodyBg,
   fontFamily: EMAIL_FONTS.sans,
   margin: 0,
   padding: '24px 0',
};

const container: React.CSSProperties = {
   margin: '0 auto',
   backgroundColor: EMAIL_COLORS.cardBg,
   borderRadius: '16px',
   overflow: 'hidden',
   maxWidth: '560px',
   border: `1px solid ${EMAIL_COLORS.borderDefault}`,
   boxShadow: EMAIL_COLORS.shadowCard,
};

const accentBar: React.CSSProperties = {
   height: '4px',
   width: '100%',
   background: `linear-gradient(90deg, ${EMAIL_COLORS.primary} 0%, ${EMAIL_COLORS.brandAccent} 100%)`,
};

const hr: React.CSSProperties = {
   borderColor: EMAIL_COLORS.borderSubtle,
   margin: '0',
};
