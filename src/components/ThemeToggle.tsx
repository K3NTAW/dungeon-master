'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { themes } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentTheme = themes.find(t => t.value === theme);

  const getIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 p-0"
        aria-label="Toggle theme"
      >
        {getIcon(theme)}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[120px] rounded-md border bg-background shadow-lg">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                  theme === themeOption.value ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <span className="text-base">{themeOption.icon}</span>
                {themeOption.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 