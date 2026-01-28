import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { User, UserSettings, AuthResponse, UpdateUserSettingsInput, CreateUserInput } from '../types/user';

interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  updateSettings: (settings: UpdateUserSettingsInput) => Promise<void>;
  clearError: () => void;
  checkIfUsersExist: () => Promise<boolean>;
  registerFirstUser: (input: CreateUserInput) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  settings: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await invoke<AuthResponse>('login', {
        credentials: { username, password },
      });

      set({
        user: response.user,
        settings: response.settings,
        sessionToken: response.session_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Salva la password in localStorage per visualizzazione nell'account
      localStorage.setItem('bmp_user_password', password);

      // Applica il tema dell'utente
      const themeStore = await import('./themeStore');
      themeStore.useThemeStore.getState().initFromUserSettings(response.settings);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Errore durante il login';
      set({
        user: null,
        settings: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    const { sessionToken } = get();
    if (!sessionToken) {
      set({
        user: null,
        settings: null,
        sessionToken: null,
        isAuthenticated: false,
      });
      return;
    }

    try {
      await invoke('logout', { sessionToken });
    } catch (error) {
      console.error('Errore durante il logout:', error);
    } finally {
      set({
        user: null,
        settings: null,
        sessionToken: null,
        isAuthenticated: false,
        error: null,
      });
      // Il tema persiste in localStorage - non resettare al logout
    }
  },

  verifySession: async () => {
    const { sessionToken } = get();
    if (!sessionToken) {
      set({ isAuthenticated: false, user: null, settings: null });
      return false;
    }

    set({ isLoading: true });
    try {
      const response = await invoke<AuthResponse>('verify_session', {
        sessionToken,
      });

      set({
        user: response.user,
        settings: response.settings,
        sessionToken: response.session_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Applica il tema dell'utente
      const themeStore = await import('./themeStore');
      themeStore.useThemeStore.getState().initFromUserSettings(response.settings);

      return true;
    } catch (error: any) {
      console.error('Sessione non valida:', error);
      set({
        user: null,
        settings: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return false;
    }
  },

  updateSettings: async (settingsInput: UpdateUserSettingsInput) => {
    const { user, sessionToken } = get();
    if (!user || !sessionToken) {
      throw new Error('Utente non autenticato');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedSettings = await invoke<UserSettings>('update_user_settings', {
        userId: user.id,
        input: settingsInput,
      });

      set({
        settings: updatedSettings,
        isLoading: false,
        error: null,
      });

      // Il tema è già stato applicato via setTheme() nel componente Settings
      // Non chiamare initFromUserSettings qui perché sovrascrive le modifiche locali
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Errore nell\'aggiornamento delle impostazioni';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  clearError: () => set({ error: null }),

  checkIfUsersExist: async () => {
    try {
      const usersExist = await invoke<boolean>('check_users_exist');
      return usersExist;
    } catch (error) {
      console.error('Errore verifica utenti:', error);
      return false;
    }
  },

  registerFirstUser: async (input: CreateUserInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await invoke<AuthResponse>('register_first_user', {
        input,
      });

      set({
        user: response.user,
        settings: response.settings,
        sessionToken: response.session_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Applica il tema dell'utente
      const themeStore = await import('./themeStore');
      themeStore.useThemeStore.getState().initFromUserSettings(response.settings);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Errore durante la registrazione';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },
}));
