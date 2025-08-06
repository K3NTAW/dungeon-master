'use client';

import { useEffect } from 'react';
import { initializeTheme } from '@/lib/theme';

export function ThemeInitializer() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return null;
} 