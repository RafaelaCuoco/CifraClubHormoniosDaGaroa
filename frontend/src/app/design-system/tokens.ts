/**
 * Tokens oficiais do Design System Cifra Trans.
 * Espelhados em CSS Custom Properties em src/styles.css para suportar
 * os temas Claro ("light") e Escuro Modo Palco ("stage").
 */
export type ThemeMode = 'stage' | 'light';

export const DESIGN_TOKENS = {
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px'
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    '2xl': '24px',
    full: '9999px'
  },
  zIndex: {
    base: 1,
    sticky: 20,
    header: 30,
    dropdown: 40,
    modal: 50,
    toast: 60
  },
  typography: {
    fontSans:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontMono:
      '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    }
  },
  icons: {
    strokeWidth: 2,
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24
    }
  }
} as const;
