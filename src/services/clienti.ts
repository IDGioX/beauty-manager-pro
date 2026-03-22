import { invoke } from '@tauri-apps/api/core';
import { Cliente, CreateClienteInput, UpdateClienteInput } from '../types/cliente';

export const clientiService = {
  async getClienti(search?: string, limit?: number, offset?: number, includeInactive?: boolean): Promise<Cliente[]> {
    return await invoke('get_clienti', { search, limit, offset, includeInactive: includeInactive || false });
  },

  async getCliente(id: string): Promise<Cliente> {
    return await invoke('get_cliente', { id });
  },

  async createCliente(input: CreateClienteInput): Promise<Cliente> {
    return await invoke('create_cliente', { input });
  },

  async updateCliente(id: string, updates: UpdateClienteInput): Promise<Cliente> {
    return await invoke('update_cliente', {
      id,
      nome: updates.nome,
      cognome: updates.cognome,
      dataNascita: updates.data_nascita,
      cellulare: updates.cellulare,
      email: updates.email,
      indirizzo: updates.indirizzo,
      citta: updates.citta,
      note: updates.note,
      consensoMarketing: updates.consenso_marketing,
      consensoSms: updates.consenso_sms,
      consensoWhatsapp: updates.consenso_whatsapp,
      consensoEmail: updates.consenso_email,
      tipoPelle: updates.tipo_pelle,
      allergie: updates.allergie,
      patologie: updates.patologie,
      noteEstetiche: updates.note_estetiche,
      fonteAcquisizione: updates.fonte_acquisizione,
    });
  },

  async deactivateCliente(id: string): Promise<void> {
    return await invoke('deactivate_cliente', { id });
  },

  async reactivateCliente(id: string): Promise<void> {
    return await invoke('reactivate_cliente', { id });
  },

  async deleteCliente(id: string): Promise<void> {
    return await invoke('delete_cliente', { id });
  },
};
