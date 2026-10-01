import React, { type FC } from 'react';
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import { EMAIL_COLORS, EMAIL_FONTS } from '@notification/constants/email-theme';

export interface OtpEmailProps {
   fullName?: string;
   otpCode?: string;
   expiresInMinutes?: number;
}

export const OtpEmail: FC<OtpEmailProps> = ({ fullName, otpCode = '123456', expiresInMinutes = 10 }) => {
   const greeting = fullName ? `Hi ${fullName},` : 'Hello,';
   const currentYear = new Date().getFullYear();

   return (
      <Html>
         <Head />
         <Preview>Your OmniServices verification code: {otpCode}</Preview>
         <Body style={main}>
            <Container style={container}>
               {/* Brand Gradient Top Accent */}
               <div style={accentBar} />

               {/* Header / Brand Identity */}
               <Section style={header}>
                  <Text style={brandBadge}>SECURITY VERIFICATION</Text>
                  <Heading style={headerTitle}>OmniServices</Heading>
               </Section>

               {/* Main Content */}
               <Section style={content}>
                  <Heading as="h2" style={heading}>
                     Your Verification Code
                  </Heading>

                  <Text style={paragraph}>{greeting}</Text>
                  <Text style={paragraph}>
                     Use the following One-Time Password (OTP) to complete your verification. This code is confidential
                     and valid for a single use.
                  </Text>

                  {/* OTP Highlight Box */}
                  <Section style={otpCard}>
                     <Text style={otpCodeLabel}>ONE-TIME PASSWORD</Text>
                     <Text style={otpCodeValue}>{otpCode}</Text>
                     <div style={badgeContainer}>
                        <span style={expiryBadge}>Expires in {expiresInMinutes} minutes</span>
                     </div>
                  </Section>

                  {/* Security Advisory Alert Box */}
                  <Section style={alertBox}>
                     <Text style={alertText}>
                        <strong style={alertTitle}>Security Notice:</strong>
                        <br />
                        Never share this code with anyone. OmniServices representatives will never ask you for your
                        verification code or password.
                     </Text>
                  </Section>

                  <Text style={subText}>
                     If you did not request this verification code, please ignore this email or review your account
                     security settings immediately.
                  </Text>
               </Section>

               <Hr style={hr} />

               {/* Footer */}
               <Section style={footer}>
                  <Text style={footerBrand}>OmniServices Inc.</Text>
                  <Text style={footerText}>&copy; {currentYear} OmniServices (zeion.online). All rights reserved.</Text>
                  <Text style={footerSubText}>
                     This is an automated security transmission. Please do not reply directly to this email.
                  </Text>
               </Section>
            </Container>
         </Body>
      </Html>
   );
};

export default OtpEmail;

// --- STYLES ---

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
   margin: '10px 0',
   textAlign: 'center',
};

const otpCard: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.codeBoxBg,
   border: `1.5px dashed ${EMAIL_COLORS.borderDashed}`,
   borderRadius: '12px',
   padding: '24px 16px',
   textAlign: 'center',
   margin: '24px 0',
   boxShadow: EMAIL_COLORS.shadowOtp,
};

const otpCodeLabel: React.CSSProperties = {
   fontSize: '11px',
   fontWeight: '700',
   letterSpacing: '1px',
   color: EMAIL_COLORS.textMuted,
   margin: '0 0 10px 0',
   textTransform: 'uppercase',
};

const otpCodeValue: React.CSSProperties = {
   fontFamily: EMAIL_FONTS.mono,
   fontSize: '36px',
   fontWeight: '800',
   letterSpacing: '10px',
   color: EMAIL_COLORS.textHeading,
   margin: '0',
   paddingLeft: '10px',
   lineHeight: '1.2',
};

const badgeContainer: React.CSSProperties = {
   marginTop: '14px',
   textAlign: 'center',
};

const expiryBadge: React.CSSProperties = {
   display: 'inline-block',
   backgroundColor: EMAIL_COLORS.primaryLight,
   color: EMAIL_COLORS.primary,
   padding: '4px 12px',
   borderRadius: '9999px',
   fontSize: '12px',
   fontWeight: '600',
   border: `1px solid ${EMAIL_COLORS.primaryBorder}`,
};

const alertBox: React.CSSProperties = {
   backgroundColor: EMAIL_COLORS.warningBg,
   border: `1px solid ${EMAIL_COLORS.warningBorder}`,
   borderRadius: '10px',
   padding: '14px 16px',
   margin: '20px 0 16px 0',
};

const alertTitle: React.CSSProperties = {
   color: EMAIL_COLORS.warningText,
   fontSize: '13px',
};

const alertText: React.CSSProperties = {
   fontSize: '13px',
   lineHeight: '20px',
   color: EMAIL_COLORS.warningText,
   margin: 0,
};

const subText: React.CSSProperties = {
   fontSize: '13px',
   lineHeight: '20px',
   color: EMAIL_COLORS.textMuted,
   margin: '12px 0 0 0',
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
