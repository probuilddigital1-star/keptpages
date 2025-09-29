// Premium color palette for Sleek Invoice Builder
// Professional, sophisticated color scheme for business applications

export const colors = {
  // Primary colors - Deep Ocean theme
  primary: {
    dark: '#0B1426',      // Deep Ocean Blue - Primary dark
    main: '#1E3A5F',      // Steel Blue - Secondary
    light: '#2C4E7B',     // Lighter steel
    50: '#EBF2FF',
    100: '#D6E4FF',
    200: '#ADC9FF',
    300: '#84A9FF',
    400: '#6690FF',
    500: '#3366FF',
    600: '#254EDB',
    700: '#1939B7',
    800: '#102693',
    900: '#0B1426'
  },

  // Accent colors
  accent: {
    primary: '#2563EB',      // Professional Blue - CTAs and pro features
    primaryLight: '#60A5FA',
    primaryDark: '#1E40AF',
    primarySoft: '#EFF6FF',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)'
  },

  // Status colors
  status: {
    success: '#027A48',       // Success Green - Payments, positive actions
    successLight: '#05A660',
    successSoft: '#ECFDF3',
    warning: '#B54708',       // Warning Amber - Overdue, attention needed
    warningLight: '#DC6803',
    warningSoft: '#FFFAEB',
    error: '#B42318',
    errorLight: '#D92D20',
    errorSoft: '#FEF3F2',
    info: '#0B5394',
    infoLight: '#026AA2',
    infoSoft: '#EFF8FF'
  },

  // Neutral colors
  neutral: {
    white: '#FAFBFC',        // Pearl White - Background
    offWhite: '#F7F9FB',     // Silver Gray - Cards
    background: '#FAFBFC',
    surface: '#F7F9FB',
    border: '#EAECF0',       // Mist - Borders
    borderDark: '#D0D5DD',
    text: '#1D2939',         // Charcoal - Primary text
    textSecondary: '#475467', // Slate - Secondary text
    textTertiary: '#667085',
    textDisabled: '#98A2B3',
    gray: {
      50: '#F9FAFB',
      100: '#F7F9FB',
      200: '#EAECF0',
      300: '#D0D5DD',
      400: '#98A2B3',
      500: '#667085',
      600: '#475467',
      700: '#344054',
      800: '#1D2939',
      900: '#101828'
    }
  },

  // Gradients
  gradients: {
    premium: 'linear-gradient(135deg, #0B1426 0%, #2563EB 100%)',
    premiumSubtle: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #1E3A5F 100%)',
    ocean: 'linear-gradient(180deg, #0B1426 0%, #1E3A5F 100%)',
    primary: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
    success: 'linear-gradient(135deg, #027A48 0%, #05A660 100%)',
    card: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FB 100%)',
    subtle: 'linear-gradient(180deg, #FAFBFC 0%, #F7F9FB 100%)'
  },

  // Shadows with premium feel
  shadows: {
    xs: '0 1px 2px rgba(11, 20, 38, 0.05)',
    sm: '0 2px 4px rgba(11, 20, 38, 0.06)',
    md: '0 4px 8px rgba(11, 20, 38, 0.08)',
    lg: '0 10px 15px rgba(11, 20, 38, 0.1)',
    xl: '0 20px 25px rgba(11, 20, 38, 0.12)',
    premium: '0 10px 40px rgba(37, 99, 235, 0.15)',
    card: '0 1px 3px rgba(11, 20, 38, 0.1), 0 1px 2px rgba(11, 20, 38, 0.06)'
  }
};

// Export individual color groups for convenience
export const { primary, accent, status, neutral, gradients, shadows } = colors;

// Theme presets
export const themes = {
  light: {
    background: neutral.white,
    surface: neutral.offWhite,
    text: neutral.text,
    textSecondary: neutral.textSecondary,
    border: neutral.border,
    primary: primary.main,
    accent: accent.primary
  },
  dark: {
    background: primary.dark,
    surface: primary.main,
    text: neutral.white,
    textSecondary: neutral.gray[300],
    border: primary.light,
    primary: accent.primary,
    accent: accent.primaryLight
  }
};

export default colors;