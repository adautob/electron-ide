'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage or default to 'dark'
  // This function runs only on the client, so localStorage is safe to access.
  const getInitialTheme = useCallback((): Theme => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as Theme | null;
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        return storedTheme;
      }
      // Optionally, check system preference if no stored theme
      // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // return prefersDark ? 'dark' : 'light';
    }
    return 'dark'; // Default theme
  }, []);
  
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    // This effect runs when the component mounts on the client.
    // It ensures the theme state is correctly initialized from localStorage.
    setThemeState(getInitialTheme());
  }, [getInitialTheme]);
  

  useEffect(() => {
    // This effect runs whenever the theme state changes.
    // It applies the theme to the document and updates localStorage.
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark'); // Remove previous theme classes
      root.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
