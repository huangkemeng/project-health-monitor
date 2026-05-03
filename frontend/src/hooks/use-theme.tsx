'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeStyle = 'classic' | 'linear';

interface ThemeContextType {
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'health-monitor-theme-style';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>('classic');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeStyle | null;
    if (stored && (stored === 'classic' || stored === 'linear')) {
      setThemeStyleState(stored);
      applyTheme(stored);
    }
    setMounted(true);
  }, []);

  // Apply theme to document
  const applyTheme = (style: ThemeStyle) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (style === 'linear') {
        root.setAttribute('data-theme', 'linear');
      } else {
        root.removeAttribute('data-theme');
      }
    }
  };

  const setThemeStyle = (style: ThemeStyle) => {
    setThemeStyleState(style);
    applyTheme(style);
    localStorage.setItem(THEME_STORAGE_KEY, style);
  };

  const toggleTheme = () => {
    const newStyle = themeStyle === 'classic' ? 'linear' : 'classic';
    setThemeStyle(newStyle);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ themeStyle, setThemeStyle, toggleTheme }}>
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
