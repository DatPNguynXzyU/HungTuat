import * as React from 'react';
import {
   Body,
   Button,
   Container,
   Head,
   Heading,
   Hr,
   Html,
   Link,
   Preview,
   Section,
   Text,
} from '@react-email/components';
import { EMAIL_COLORS, EMAIL_FONTS } from '@notification/constants';

export interface VerificationEmailProps {
   fullName?: string;
   verificationUrl?: string;
   token?: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
   fullName = 'User',
   verificationUrl = 'https://zeion.online/verify',
   token,
}) => {
   const currentYear = new Date().getFullYear();

   return (
      <Html>
         <Head />
         <Preview>Verify your OmniServices email address</Preview>
         <Body style={main}>
            <Container style={container}>
               <div style={accentBar} />
               <Section style={header}>
                  <Text style={brandBadge}>EMAIL VERIFICATION</Text>
                  <Heading style={headerTitle}>OmniServices</Heading>
               </Section>
               <Section style={content}>
                  <Heading as="h2" style={heading}>
                     Verify your email address
                  </Heading>
                  <Text style={paragraph}>Hi {fullName},</Text>
                  <Text style={paragraph}>
                     Thank you for signing up with OmniServices. Please verify your email address to activate your full
                     account features.
                  </Text>
                  <Section style={btnContainer}>
                     <Button style={button} href={verificationUrl}>
                        Verify Email Address
                     </Button>
                  </Section>
                  {token && (
                     <Section style={tokenBox}>
                        <Text style={tokenLabel}>OR USE VERIFICATION CODE</Text>
                        <Text style={tokenValue}>{token}</Text>
                     </Section>
                  )}
                  <Text style={subText}>
                     If the button above does not work, copy and paste this link into your browser:
                     <br />
                     <Link href={verificationUrl} style={link}>
                        {verificationUrl}
                     </Link>
                  </Text>
                  <Text style={subText}>
                     If you did not create an account with OmniServices, please ignore this email.
                  </Text>
               </Section>
               <Hr style={hr} />
               <Section style={footer}>
                  <Text style={footerBrand}>OmniServices Inc.</Text>
                  <Text style={footerText}>&copy; {currentYear} OmniServices (zeion.online). All rights reserved.</Text>
                  <Text style={footerSubText}>This is an automated email, please do not reply directly.</Text>
               </Section>
            </Container>
         </Body>
      </Html>
   );
};

export default VerificationEmail;

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

const header: React.CSSProperties = {
   padding: '32px 24px 16px 24px',
   textAlign: 'center',
   backgroundColor: EMAIL_COLORS.cardBg,
};

const brandBadge: React.CSSProperties = {
   fontSize: '11px',
   fontWeight: '700',
   letterSpacing: '1.5px',
   color: EMAIL_COLORS.primary,
   margin: '0 0 8px 0',
   textTransform: 'uppercase',
};

const headerTitle: React.CSSProperties = {
   color: EMAIL_COLORS.textHeading,
   fontSize: '26px',
   fontWeight: '800',
   letterSpacing: '-0.5px',
   margin: 0,
};

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

const hr: React.CSSProperties = {
   borderColor: EMAIL_COLORS.borderSubtle,
   margin: '0',
};

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
