'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeProviderState, getTheme, setTheme, watchSystemTheme } from '@/lib/theme';

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentTheme = getTheme();
    setThemeState(currentTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = watchSystemTheme(() => {
      if (theme === 'system') {
        setThemeState('system');
      }
    });

    return unsubscribe;
  }, [theme, mounted]);

  const handleThemeChange = (newTheme: Theme) => {
    setThemeState(newTheme);
    setTheme(newTheme);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 