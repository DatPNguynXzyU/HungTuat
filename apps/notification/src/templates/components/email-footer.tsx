import React, { type FC } from 'react';
import { Section, Text } from '@react-email/components';
import { EMAIL_COLORS } from '@notification/constants/email-theme';
import { CommonTranslations } from '@notification/i18n';

export interface EmailFooterProps {
   common: CommonTranslations;
   isSecurityEmail?: boolean;
}

export const EmailFooter: FC<EmailFooterProps> = ({ common, isSecurityEmail = false }) => {
   const currentYear = new Date().getFullYear();
   const copyright = common.copyright.replace('{year}', currentYear.toString());
   const subNotice = isSecurityEmail && common.securityNotice ? common.securityNotice : common.autoEmailNotice;

   return (
      <Section style={footer}>
         <Text style={footerBrand}>{common.brandName} Inc.</Text>
         <Text style={footerText}>{copyright}</Text>
         <Text style={footerSubText}>{subNotice}</Text>
      </Section>
   );
};

export default EmailFooter;

const footer: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.cardSubtleBg,
   padding: '24px 32px',
   textAlign: 'center',
};

const footerBrand: React.CSSProperties = {
   fontSize: '13px',
   fontWeight: '600',
   color: EMAIL_COLORS.textBody,
   margin: '0 0 4px 0',
};

const footerText: React.CSSProperties = {
   fontSize: '12px',
   color: EMAIL_COLORS.textMuted,
   margin: '2px 0',
};

const footerSubText: React.CSSProperties = {
   fontSize: '11px',
   color: EMAIL_COLORS.textLight,
   margin: '8px 0 0 0',
   lineHeight: '16px',
};
