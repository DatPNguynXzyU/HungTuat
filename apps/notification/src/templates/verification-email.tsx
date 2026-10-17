import React, { type FC } from 'react';
import { Button, Heading, Link, Section, Text } from '@react-email/components';
import { EMAIL_COLORS, EMAIL_FONTS } from '@notification/constants';
import { BaseTranslations, getDefaultTranslations } from '@notification/i18n';
import { EmailHeader, EmailLayout } from '@notification/templates/components';

export interface VerificationEmailProps {
   fullName?: string;
   verificationUrl: string;
   token?: string;
   translations?: BaseTranslations;
}

export const VerificationEmail: FC<VerificationEmailProps> = ({
   fullName = 'User',
   verificationUrl,
   token,
   translations,
}) => {
   const currentTranslations = translations || getDefaultTranslations();
   const t = currentTranslations.verification;
   const common = currentTranslations.common;

   const greeting = t.greeting.replace('{fullName}', fullName);

   return (
      <EmailLayout preview={t.preview} common={common}>
         <EmailHeader badge={t.badge} brandName={common.brandName} />
         <Section style={content}>
            <Heading as="h2" style={heading}>
               {t.heading}
            </Heading>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>{t.body}</Text>
            <Section style={btnContainer}>
               <Button style={button} href={verificationUrl}>
                  {t.ctaButton}
               </Button>
            </Section>
            {token && (
               <Section style={tokenBox}>
                  <Text style={tokenLabel}>{t.tokenLabel}</Text>
                  <Text style={tokenValue}>{token}</Text>
               </Section>
            )}
            <Text style={subText}>
               {t.orText}
               <br />
               <Link href={verificationUrl} style={link}>
                  {verificationUrl}
               </Link>
            </Text>
            <Text style={subText}>{t.disclaimerText}</Text>
         </Section>
      </EmailLayout>
   );
};

export default VerificationEmail;

const content: React.CSSProperties = {
   padding: '16px 32px 32px 32px',
};

const heading: React.CSSProperties = {
   fontSize: '22px',
   fontWeight: '700',
   color: EMAIL_COLORS.textHeading,
   textAlign: 'center',
   margin: '0 0 16px 0',
   letterSpacing: '-0.3px',
};

const paragraph: React.CSSProperties = {
   fontSize: '15px',
   lineHeight: '24px',
   color: EMAIL_COLORS.textBody,
   margin: '12px 0',
   textAlign: 'center',
};

const btnContainer: React.CSSProperties = {
   textAlign: 'center',
   margin: '24px 0',
};

const button: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.primary,
   borderRadius: '8px',
   color: EMAIL_COLORS.textWhite,
   fontSize: '15px',
   fontWeight: '600',
   textDecoration: 'none',
   textAlign: 'center',
   display: 'inline-block',
   padding: '12px 32px',
};

const tokenBox: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.codeBoxBg,
   border: `1px dashed ${EMAIL_COLORS.borderDashed}`,
   borderRadius: '10px',
   padding: '16px',
   textAlign: 'center',
   margin: '20px 0',
};

const tokenLabel: React.CSSProperties = {
   fontSize: '11px',
   fontWeight: '700',
   letterSpacing: '1px',
   color: EMAIL_COLORS.textMuted,
   margin: '0 0 6px 0',
   textTransform: 'uppercase',
};

const tokenValue: React.CSSProperties = {
   fontFamily: EMAIL_FONTS.mono,
   fontSize: '24px',
   fontWeight: '700',
   letterSpacing: '4px',
   color: EMAIL_COLORS.textHeading,
   margin: '0',
};

const link: React.CSSProperties = {
   color: EMAIL_COLORS.primary,
   wordBreak: 'break-all',
   textDecoration: 'underline',
};

const subText: React.CSSProperties = {
   fontSize: '13px',
   lineHeight: '20px',
   color: EMAIL_COLORS.textMuted,
   margin: '12px 0',
   textAlign: 'center',
};
