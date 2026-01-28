import { invoke } from '@tauri-apps/api/core';
import type { Operatrice } from '../types/agenda';

export interface CreateOperatriceInput {
  codice: string;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  colore_agenda?: string;
  specializzazioni?: string;
}

export interface UpdateOperatriceInput {
  codice?: string;
  nome?: string;
  cognome?: string;
  telefono?: string;
  email?: string;
  colore_agenda?: string;
  specializzazioni?: string;
  attiva?: boolean;
  note?: string;
}

export const operatriciService = {
  async getOperatrici(includeInactive?: boolean): Promise<Operatrice[]> {
    return await invoke('get_operatrici', { includeInactive: includeInactive || false });
  },

  async getOperatrice(id: string): Promise<Operatrice> {
    return await invoke('get_operatrice', { id });
  },

  async createOperatrice(input: CreateOperatriceInput): Promise<Operatrice> {
    return await invoke('create_operatrice', { input });
  },

  async updateOperatrice(id: string, input: UpdateOperatriceInput): Promise<Operatrice> {
    return await invoke('update_operatrice', { id, input });
  },

  async deactivateOperatrice(id: string): Promise<void> {
    return await invoke('deactivate_operatrice', { id });
  },

  async reactivateOperatrice(id: string): Promise<void> {
    return await invoke('reactivate_operatrice', { id });
  },

  async deleteOperatrice(id: string): Promise<void> {
    return await invoke('delete_operatrice', { id });
  },
};
