export const EMAIL_COLORS = {
   // Brand colors
   primary: '#4f46e5',
   primaryHover: '#4338ca',
   primaryLight: '#eef2ff',
   primaryDark: '#3730a3',
   primaryBorder: '#c7d2fe',
   brandAccent: '#06b6d4',

   // Backgrounds
   bodyBg: '#f8fafc',
   cardBg: '#ffffff',
   cardSubtleBg: '#f8fafc',
   codeBoxBg: '#f1f5f9',

   // Text colors
   textHeading: '#0f172a',
   textBody: '#334155',
   textMuted: '#64748b',
   textLight: '#94a3b8',
   textWhite: '#ffffff',
   textPrimary: '#4f46e5',

   // Borders
   borderSubtle: '#f1f5f9',
   borderDefault: '#e2e8f0',
   borderHighlight: '#c7d2fe',
   borderDashed: '#cbd5e1',

   // Alert / Security badge colors
   warningBg: '#fffbeb',
   warningBorder: '#fde68a',
   warningText: '#92400e',
   warningIcon: '#f59e0b',

   successBg: '#ecfdf5',
   successBorder: '#a7f3d0',
   successText: '#065f46',

   infoBg: '#eff6ff',
   infoBorder: '#bfdbfe',
   infoText: '#1e40af',

   // Shadows
   shadowCard: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
   shadowOtp: 'inset 0 2px 4px 0 rgba(15, 23, 42, 0.04)',
} as const;

export const EMAIL_FONTS = {
   sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
   mono: "'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;
