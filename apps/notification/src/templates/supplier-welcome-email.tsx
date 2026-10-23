import React, { type FC } from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EMAIL_COLORS, EMAIL_FONTS } from '@notification/constants/email-theme';
import { BaseTranslations, getDefaultTranslations } from '@notification/i18n';
import { EmailHeader, EmailLayout } from '@notification/templates/components';

export interface SupplierWelcomeEmailProps {
   fullName?: string;
   supplierName?: string;
   actionUrl: string;
   translations?: BaseTranslations;
}

export const SupplierWelcomeEmail: FC<SupplierWelcomeEmailProps> = ({
   fullName = 'Partner',
   supplierName,
   actionUrl,
   translations,
}) => {
   const currentTranslations = translations || getDefaultTranslations();
   const t = currentTranslations.supplierWelcome;
   const common = currentTranslations.common;

   const displayName = supplierName || fullName;
   const preview = t.preview.replace('{fullName}', displayName);
   const heading = t.heading.replace('{fullName}', displayName);
   const signoffLines = t.signoff.split('\n');

   return (
      <EmailLayout preview={preview} common={common}>
         <EmailHeader badge={t.badge} brandName={common.brandName} />
         <Section style={content}>
            <Heading as="h2" style={headingStyle}>
               {heading}
            </Heading>
            <Text style={paragraph}>{t.body1}</Text>
            <Text style={paragraph}>{t.body2}</Text>

            <Section style={stepsContainer}>
               <Section style={stepCard}>
                  <Text style={stepTitle}>{t.step1Title}</Text>
                  <Text style={stepDesc}>{t.step1Desc}</Text>
               </Section>
               <Section style={stepCard}>
                  <Text style={stepTitle}>{t.step2Title}</Text>
                  <Text style={stepDesc}>{t.step2Desc}</Text>
               </Section>
               <Section style={stepCard}>
                  <Text style={stepTitle}>{t.step3Title}</Text>
                  <Text style={stepDesc}>{t.step3Desc}</Text>
               </Section>
            </Section>

            <Section style={btnContainer}>
               <Button style={button} href={actionUrl}>
                  {t.ctaButton}
               </Button>
            </Section>

            <Text style={paragraph}>{t.supportText}</Text>
            <Text style={signoffText}>
               {signoffLines[0]}
               <br />
               <strong>{signoffLines.slice(1).join(' ').replace(/\*\*/g, '')}</strong>
            </Text>
         </Section>
      </EmailLayout>
   );
};

export default SupplierWelcomeEmail;

const content: React.CSSProperties = {
   padding: '16px 32px 32px 32px',
};

const headingStyle: React.CSSProperties = {
   fontSize: '22px',
   fontWeight: '700',
   fontFamily: EMAIL_FONTS.sans,
   color: EMAIL_COLORS.textHeading,
   textAlign: 'center',
   margin: '0 0 16px 0',
   letterSpacing: '-0.3px',
};

const paragraph: React.CSSProperties = {
   fontSize: '15px',
   lineHeight: '24px',
   fontFamily: EMAIL_FONTS.sans,
   color: EMAIL_COLORS.textBody,
   margin: '12px 0',
   textAlign: 'center',
};

const stepsContainer: React.CSSProperties = {
   margin: '24px 0',
   padding: '0',
};

const stepCard: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.cardSubtleBg,
   border: `1px solid ${EMAIL_COLORS.borderDefault}`,
   borderRadius: '8px',
   padding: '14px 18px',
   margin: '10px 0',
   textAlign: 'left',
};

const stepTitle: React.CSSProperties = {
   fontSize: '14px',
   fontWeight: '700',
   fontFamily: EMAIL_FONTS.sans,
   color: EMAIL_COLORS.primary,
   margin: '0 0 4px 0',
};

const stepDesc: React.CSSProperties = {
   fontSize: '13px',
   lineHeight: '20px',
   fontFamily: EMAIL_FONTS.sans,
   color: EMAIL_COLORS.textBody,
   margin: '0',
};

const btnContainer: React.CSSProperties = {
   textAlign: 'center',
   margin: '28px 0',
};

const button: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.primary,
   borderRadius: '8px',
   color: EMAIL_COLORS.textWhite,
   fontSize: '15px',
   fontWeight: '600',
   fontFamily: EMAIL_FONTS.sans,
   textDecoration: 'none',
   textAlign: 'center',
   display: 'inline-block',
   padding: '12px 32px',
};

const signoffText: React.CSSProperties = {
   fontSize: '15px',
   lineHeight: '24px',
   fontFamily: EMAIL_FONTS.sans,
   color: EMAIL_COLORS.textBody,
   margin: '20px 0 0 0',
   textAlign: 'center',
};
