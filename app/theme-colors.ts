export const APP_THEME_COLORS = {
  light: '#eef1f5',
  dark: '#0f1315',
} as const;

export type Theme = keyof typeof APP_THEME_COLORS;
