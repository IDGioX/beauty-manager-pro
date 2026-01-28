import React, { useEffect, ReactNode } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { initTheme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Inizializza il tema all'avvio
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    // Quando l'utente si autentica, il tema viene inizializzato
    // da authStore.login() che chiama themeStore.initFromUserSettings()
    // Questo è solo per assicurarsi che il tema sia applicato
    if (isAuthenticated) {
      initTheme();
    }
  }, [isAuthenticated, initTheme]);

  return <>{children}</>;
};
