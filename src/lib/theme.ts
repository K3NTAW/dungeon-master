/* eslint-disable @typescript-eslint/no-explicit-any */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const themes: { value: Theme; label: string; icon: string }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: '☀️'
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: '🌙'
  },
  {
    value: 'system',
    label: 'System',
    icon: '💻'
  }
];

/**
 * Get the current theme from localStorage or system preference
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  
  const stored = localStorage.getItem('theme') as Theme;
  if (stored && themes.some(t => t.value === stored)) {
    return stored;
  }
  
  return 'system';
}

/**
 * Set the theme in localStorage and apply to document
 */
export function setTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}

/**
 * Apply the theme to the document
 */
export function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  
  const root = window.document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

/**
 * Get the effective theme (resolves 'system' to actual theme)
 */
export function getEffectiveTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  const theme = getTheme();
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Listen for system theme changes
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void) {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * Initialize theme on app load
 */
export function initializeTheme() {
  const theme = getTheme();
  applyTheme(theme);
  
  // Watch for system theme changes if using system theme
  if (theme === 'system') {
    watchSystemTheme((newTheme) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
    });
  }
} 