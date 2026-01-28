import React, { useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { SplashScreen } from './SplashScreen';
import { Login } from '../../pages/Login';
import { FirstUserRegistration } from '../../pages/FirstUserRegistration';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, checkIfUsersExist } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const [isVerifying, setIsVerifying] = useState(true);
  const [usersExist, setUsersExist] = useState(false);

  useEffect(() => {
    const verify = async () => {
      setIsVerifying(true);

      // Verifica se esistono utenti nel sistema
      const exist = await checkIfUsersExist();
      setUsersExist(exist);

      setIsVerifying(false);
    };

    verify();
  }, [checkIfUsersExist]);

  useEffect(() => {
    // Mostra splash screen per minimo 3.5 secondi
    const minSplashTime = setTimeout(() => {
      setShowSplash(false);
    }, 3500);

    return () => clearTimeout(minSplashTime);
  }, []);

  // Mostra splash durante verifica e per i primi 3.5 secondi
  if (showSplash || isVerifying) {
    return <SplashScreen />;
  }

  // Se autenticato, mostra l'app (priorità massima)
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Se non esistono utenti, mostra form registrazione primo utente
  if (!usersExist) {
    return <FirstUserRegistration />;
  }

  // Se non autenticato, mostra login
  return <Login />;
};
