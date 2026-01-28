// Sistema di Palette Colori per Beauty Manager Pro
// Ogni palette include tutti i colori necessari per l'interfaccia

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  preview: string; // Colore principale per anteprima

  // Colori principali
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Colori secondari
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  // Colore accento
  accent: string;
  accentLight: string;
  accentDark: string;

  // Sfondi
  bgBase: string;
  bgSecondary: string;
  bgTertiary: string;

  // Testo
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Glass/Card
  glassBg: string;
  glassBorder: string;
  glassShadow: string;
  cardBg: string;
  cardHover: string;

  // Sidebar
  sidebarBg: string;
  sidebarGradientEnd: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarHover: string;

  // Status colors (uguale per tutti)
  success: string;
  warning: string;
  danger: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'coral-beauty',
    name: 'Coral Beauty',
    description: 'Toni caldi corallo e crema, elegante e femminile',
    preview: '#E8927C',

    primary: '#E8927C',
    primaryLight: '#F5B5A5',
    primaryDark: '#D4745E',

    secondary: '#9B8AA8',
    secondaryLight: '#C4B5CF',
    secondaryDark: '#7A6B88',

    accent: '#7AACA8',
    accentLight: '#A5CBC8',
    accentDark: '#5E8B87',

    bgBase: '#FBF8F4',
    bgSecondary: '#F5F0E8',
    bgTertiary: '#EDE7DB',

    textPrimary: '#2D2A26',
    textSecondary: '#5C574F',
    textMuted: '#9A948A',

    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: 'rgba(45, 42, 38, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#2D2A26',
    sidebarGradientEnd: '#1A1816',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    success: '#7CB87C',
    warning: '#E8B47C',
    danger: '#E87C7C',
  },
  {
    id: 'lavender-spa',
    name: 'Lavender Spa',
    description: 'Sfumature lavanda e viola, rilassante e sofisticato',
    preview: '#9B7BB8',

    primary: '#9B7BB8',
    primaryLight: '#C4A8D4',
    primaryDark: '#7A5A98',

    secondary: '#E8A8C8',
    secondaryLight: '#F5C8DE',
    secondaryDark: '#C87AA8',

    accent: '#7ABBB8',
    accentLight: '#A8D8D5',
    accentDark: '#5A9B98',

    bgBase: '#FAF8FC',
    bgSecondary: '#F5F0F8',
    bgTertiary: '#EDE5F2',

    textPrimary: '#2A2633',
    textSecondary: '#5C5366',
    textMuted: '#9A8FA6',

    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: 'rgba(42, 38, 51, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#2A2633',
    sidebarGradientEnd: '#1A171F',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    success: '#7CB87C',
    warning: '#E8B47C',
    danger: '#E87C7C',
  },
  {
    id: 'ocean-calm',
    name: 'Ocean Calm',
    description: 'Blu oceano e verde acqua, fresco e professionale',
    preview: '#5B9EA6',

    primary: '#5B9EA6',
    primaryLight: '#8CBFC5',
    primaryDark: '#3E7B82',

    secondary: '#7B8EA6',
    secondaryLight: '#A8B8C5',
    secondaryDark: '#5A6B82',

    accent: '#E8A87B',
    accentLight: '#F5C8A8',
    accentDark: '#C8875A',

    bgBase: '#F6FAFA',
    bgSecondary: '#EDF5F5',
    bgTertiary: '#E0EDED',

    textPrimary: '#1E3038',
    textSecondary: '#4A5D66',
    textMuted: '#8A9BA3',

    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: 'rgba(30, 48, 56, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#1E3038',
    sidebarGradientEnd: '#0F1A1E',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    success: '#7CB87C',
    warning: '#E8B47C',
    danger: '#E87C7C',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Rosa dorato e champagne, lussuoso e raffinato',
    preview: '#C9A087',

    primary: '#C9A087',
    primaryLight: '#E0C4B0',
    primaryDark: '#A67C5E',

    secondary: '#B8A0A8',
    secondaryLight: '#D5C5CB',
    secondaryDark: '#8A7078',

    accent: '#87A8B8',
    accentLight: '#B0C8D5',
    accentDark: '#5E7A8A',

    bgBase: '#FDFAF8',
    bgSecondary: '#F8F2EE',
    bgTertiary: '#F0E8E2',

    textPrimary: '#3D3330',
    textSecondary: '#6B5C56',
    textMuted: '#A89890',

    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: 'rgba(61, 51, 48, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#3D3330',
    sidebarGradientEnd: '#261F1D',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    success: '#7CB87C',
    warning: '#E8B47C',
    danger: '#E87C7C',
  },
  {
    id: 'forest-wellness',
    name: 'Forest Wellness',
    description: 'Verde bosco e terra, naturale e rilassante',
    preview: '#6B9080',

    primary: '#6B9080',
    primaryLight: '#98B8A8',
    primaryDark: '#4A6858',

    secondary: '#A89078',
    secondaryLight: '#C8B8A0',
    secondaryDark: '#806850',

    accent: '#B87878',
    accentLight: '#D8A0A0',
    accentDark: '#985050',

    bgBase: '#F8FAF8',
    bgSecondary: '#F0F5F0',
    bgTertiary: '#E5EDE5',

    textPrimary: '#2A332A',
    textSecondary: '#506050',
    textMuted: '#8A9A8A',

    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: 'rgba(42, 51, 42, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#2A332A',
    sidebarGradientEnd: '#171A17',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    success: '#7CB87C',
    warning: '#E8B47C',
    danger: '#E87C7C',
  },
  {
    id: 'midnight-glam',
    name: 'Midnight Glam',
    description: 'Blu notte e oro, elegante e moderno',
    preview: '#4A5568',

    primary: '#6B7DB8',
    primaryLight: '#98A8D8',
    primaryDark: '#4A5A98',

    secondary: '#B8A868',
    secondaryLight: '#D8C898',
    secondaryDark: '#988848',

    accent: '#B86B8B',
    accentLight: '#D898B8',
    accentDark: '#984A6B',

    bgBase: '#F5F7FA',
    bgSecondary: '#EBEEF5',
    bgTertiary: '#DDE2ED',

    textPrimary: '#1A202C',
    textSecondary: '#4A5568',
    textMuted: '#8A95A5',

    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: 'rgba(26, 32, 44, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#1A202C',
    sidebarGradientEnd: '#0D1117',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',

    success: '#7CB87C',
    warning: '#E8B47C',
    danger: '#E87C7C',
  },
  {
    id: 'peach-blossom',
    name: 'Peach Blossom',
    description: 'Pesca e rosa delicato, dolce e accogliente',
    preview: '#FFAB91',

    primary: '#FFAB91',
    primaryLight: '#FFCCBC',
    primaryDark: '#E08068',

    secondary: '#F8BBD9',
    secondaryLight: '#FCE4EC',
    secondaryDark: '#E091B8',

    accent: '#80DEEA',
    accentLight: '#B2EBF2',
    accentDark: '#4DD0E1',

    bgBase: '#FFFAF8',
    bgSecondary: '#FFF5F0',
    bgTertiary: '#FFEDE5',

    textPrimary: '#3E2723',
    textSecondary: '#5D4037',
    textMuted: '#A1887F',

    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 171, 145, 0.3)',
    glassShadow: 'rgba(62, 39, 35, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#3E2723',
    sidebarGradientEnd: '#1B0F0E',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(255, 171, 145, 0.15)',

    success: '#81C784',
    warning: '#FFB74D',
    danger: '#E57373',
  },
  {
    id: 'cherry-sakura',
    name: 'Cherry Sakura',
    description: 'Rosa ciliegio stile giapponese, delicato ed elegante',
    preview: '#F48FB1',

    primary: '#F48FB1',
    primaryLight: '#F8BBD9',
    primaryDark: '#E55A8A',

    secondary: '#CE93D8',
    secondaryLight: '#E1BEE7',
    secondaryDark: '#AB47BC',

    accent: '#90CAF9',
    accentLight: '#BBDEFB',
    accentDark: '#64B5F6',

    bgBase: '#FDF8FA',
    bgSecondary: '#FCF0F4',
    bgTertiary: '#F9E5EC',

    textPrimary: '#311B22',
    textSecondary: '#5C404A',
    textMuted: '#A08890',

    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(244, 143, 177, 0.25)',
    glassShadow: 'rgba(49, 27, 34, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#311B22',
    sidebarGradientEnd: '#1A0E12',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(244, 143, 177, 0.15)',

    success: '#81C784',
    warning: '#FFB74D',
    danger: '#E57373',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Oro e bronzo caldi, lussuoso e avvolgente',
    preview: '#D4A574',

    primary: '#D4A574',
    primaryLight: '#E8C9A8',
    primaryDark: '#B8845A',

    secondary: '#C49A6C',
    secondaryLight: '#DCC4A8',
    secondaryDark: '#A07848',

    accent: '#8D6E63',
    accentLight: '#BCAAA4',
    accentDark: '#6D4C41',

    bgBase: '#FFFDF8',
    bgSecondary: '#FDF8F0',
    bgTertiary: '#F8F0E3',

    textPrimary: '#33261A',
    textSecondary: '#5C4A38',
    textMuted: '#A08868',

    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(212, 165, 116, 0.3)',
    glassShadow: 'rgba(51, 38, 26, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#33261A',
    sidebarGradientEnd: '#1A130D',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(212, 165, 116, 0.15)',

    success: '#81C784',
    warning: '#FFB74D',
    danger: '#E57373',
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    description: 'Verde menta e rosa tenue, fresco e rilassante',
    preview: '#80CBC4',

    primary: '#80CBC4',
    primaryLight: '#B2DFDB',
    primaryDark: '#4DB6AC',

    secondary: '#F8BBD9',
    secondaryLight: '#FCE4EC',
    secondaryDark: '#E091B8',

    accent: '#FFAB91',
    accentLight: '#FFCCBC',
    accentDark: '#FF8A65',

    bgBase: '#F5FDFC',
    bgSecondary: '#E8FAF8',
    bgTertiary: '#D8F5F2',

    textPrimary: '#1A332F',
    textSecondary: '#3D5C56',
    textMuted: '#78A098',

    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(128, 203, 196, 0.3)',
    glassShadow: 'rgba(26, 51, 47, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#1A332F',
    sidebarGradientEnd: '#0D1A17',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(128, 203, 196, 0.15)',

    success: '#81C784',
    warning: '#FFB74D',
    danger: '#E57373',
  },
  {
    id: 'berry-luxe',
    name: 'Berry Luxe',
    description: 'Frutti di bosco e borgogna, sofisticato e intenso',
    preview: '#AD5D7E',

    primary: '#AD5D7E',
    primaryLight: '#D4899F',
    primaryDark: '#8B3D5E',

    secondary: '#7E57C2',
    secondaryLight: '#B39DDB',
    secondaryDark: '#5E35B1',

    accent: '#F06292',
    accentLight: '#F8BBD9',
    accentDark: '#E91E63',

    bgBase: '#FDF8FA',
    bgSecondary: '#F8F0F4',
    bgTertiary: '#F0E5EB',

    textPrimary: '#2D1F26',
    textSecondary: '#5C4550',
    textMuted: '#9A8890',

    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(173, 93, 126, 0.25)',
    glassShadow: 'rgba(45, 31, 38, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#2D1F26',
    sidebarGradientEnd: '#170F13',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(173, 93, 126, 0.15)',

    success: '#81C784',
    warning: '#FFB74D',
    danger: '#E57373',
  },
  {
    id: 'modern-gray',
    name: 'Modern Gray',
    description: 'Grigio minimalista e blu acciaio, pulito e moderno',
    preview: '#607D8B',

    primary: '#607D8B',
    primaryLight: '#90A4AE',
    primaryDark: '#455A64',

    secondary: '#78909C',
    secondaryLight: '#B0BEC5',
    secondaryDark: '#546E7A',

    accent: '#26A69A',
    accentLight: '#80CBC4',
    accentDark: '#00897B',

    bgBase: '#FAFBFC',
    bgSecondary: '#F5F7F8',
    bgTertiary: '#ECEFF1',

    textPrimary: '#263238',
    textSecondary: '#546E7A',
    textMuted: '#90A4AE',

    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(96, 125, 139, 0.2)',
    glassShadow: 'rgba(38, 50, 56, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardHover: 'rgba(255, 255, 255, 0.95)',

    sidebarBg: '#263238',
    sidebarGradientEnd: '#0D1214',
    sidebarText: 'rgba(255, 255, 255, 0.7)',
    sidebarTextActive: '#FFFFFF',
    sidebarHover: 'rgba(96, 125, 139, 0.15)',

    success: '#81C784',
    warning: '#FFB74D',
    danger: '#E57373',
  },
];

export const getDefaultPalette = (): ColorPalette => {
  return COLOR_PALETTES[0]; // Coral Beauty
};

export const getPaletteById = (id: string): ColorPalette => {
  return COLOR_PALETTES.find(p => p.id === id) || getDefaultPalette();
};
