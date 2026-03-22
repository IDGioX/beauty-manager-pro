export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operatrice' | 'reception';
  nome: string;
  cognome: string;
  email?: string;
  avatar_url?: string;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme_mode: 'light' | 'dark' | 'auto';
  primary_color: string;
  palette_id?: string;
  font_size: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  dashboard_layout?: string; // JSON string
  custom_logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  settings: UserSettings;
  session_token: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: 'admin' | 'operatrice' | 'reception';
  nome: string;
  cognome: string;
  email?: string;
  avatar_url?: string;
}

export interface UpdateUserInput {
  nome?: string;
  cognome?: string;
  email?: string;
  role?: 'admin' | 'operatrice' | 'reception';
}

export interface UpdateUserSettingsInput {
  theme_mode?: 'light' | 'dark' | 'auto';
  primary_color?: string;
  palette_id?: string;
  font_size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  dashboard_layout?: string;
  custom_logo_url?: string;
}
