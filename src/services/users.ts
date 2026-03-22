import { invoke } from '@tauri-apps/api/core';
import type { User, CreateUserInput, UpdateUserInput } from '../types/user';

export const usersService = {
  async getAll(): Promise<User[]> {
    return await invoke('get_all_users');
  },

  async create(input: CreateUserInput, callerRole: string): Promise<User> {
    return await invoke('create_user', { input, callerRole });
  },

  async update(userId: string, input: UpdateUserInput, callerRole: string): Promise<User> {
    return await invoke('update_user', { userId, input, callerRole });
  },

  async toggleActive(userId: string, attivo: boolean, callerId: string): Promise<void> {
    return await invoke('toggle_user_active', { userId, attivo, callerId });
  },

  async delete(userId: string, callerRole: string): Promise<void> {
    return await invoke('delete_user', { callerRole, userId });
  },

  async changePassword(userId: string, oldPassword: string | null, newPassword: string): Promise<void> {
    return await invoke('change_password', { userId, oldPassword, newPassword });
  },
};
