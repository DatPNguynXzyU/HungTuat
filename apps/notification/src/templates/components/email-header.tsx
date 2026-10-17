import React, { type FC } from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { EMAIL_COLORS } from '@notification/constants/email-theme';

export interface EmailHeaderProps {
   badge: string;
   brandName?: string;
}

export const EmailHeader: FC<EmailHeaderProps> = ({ badge, brandName = 'OmniServices' }) => {
   return (
      <Section style={header}>
         <Text style={brandBadge}>{badge}</Text>
         <Heading style={headerTitle}>{brandName}</Heading>
      </Section>
   );
};

export default EmailHeader;

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
