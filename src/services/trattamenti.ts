import { invoke } from '@tauri-apps/api/core';
import {
  Trattamento,
  CategoriaTrattamento,
  CreateTrattamentoInput,
  UpdateTrattamentoInput,
  CreateCategoriaTrattamentoInput,
  UpdateCategoriaTrattamentoInput
} from '../types/trattamento';

export const trattamentiService = {
  async getCategorie(): Promise<CategoriaTrattamento[]> {
    return await invoke('get_categorie_trattamenti');
  },

  async getTrattamenti(categoriaId?: string, attivoOnly?: boolean): Promise<Trattamento[]> {
    return await invoke('get_trattamenti', {
      categoria_id: categoriaId,
      attivo_only: attivoOnly
    });
  },

  async getTrattamento(id: string): Promise<Trattamento> {
    return await invoke('get_trattamento', { id });
  },

  async createTrattamento(input: CreateTrattamentoInput): Promise<Trattamento> {
    return await invoke('create_trattamento', { input });
  },

  async updateTrattamento(id: string, input: UpdateTrattamentoInput): Promise<Trattamento> {
    return await invoke('update_trattamento', { id, input });
  },

  async deleteTrattamento(id: string): Promise<void> {
    return await invoke('delete_trattamento', { id });
  },

  // Metodi per gestione categorie
  async createCategoria(input: CreateCategoriaTrattamentoInput): Promise<CategoriaTrattamento> {
    return await invoke('create_categoria_trattamento', { input });
  },

  async updateCategoria(id: string, input: UpdateCategoriaTrattamentoInput): Promise<CategoriaTrattamento> {
    return await invoke('update_categoria_trattamento', { id, input });
  },

  async deleteCategoria(id: string): Promise<void> {
    return await invoke('delete_categoria_trattamento', { id });
  },
};
