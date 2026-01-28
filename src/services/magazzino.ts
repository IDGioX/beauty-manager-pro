// Service per il modulo Magazzino
import { invoke } from '@tauri-apps/api/core';
import {
  CategoriaProdotto,
  CreateCategoriaProdottoInput,
  UpdateCategoriaProdottoInput,
  Prodotto,
  CreateProdottoInput,
  UpdateProdottoInput,
  MovimentoMagazzino,
  CreateCaricoInput,
  CreateScaricoInput,
  CreateResoInput,
  CreateInventarioInput,
  FiltriMovimenti,
  AlertProdotto,
  AlertCount,
  ReportConsumiResult,
  ValoreMagazzino,
  // Inventario
  Inventario,
  RigaInventarioWithProdotto,
  CreateSessioneInventarioInput,
  CreateRigaInventarioInput,
  UpdateRigaInventarioInput,
  InventarioRiepilogo,
  ProdottoPerInventario,
} from '../types/magazzino';

export const magazzinoService = {
  // ============================================================================
  // CATEGORIE
  // ============================================================================

  async getCategorie(): Promise<CategoriaProdotto[]> {
    return await invoke('get_categorie_prodotti');
  },

  async createCategoria(input: CreateCategoriaProdottoInput): Promise<CategoriaProdotto> {
    return await invoke('create_categoria_prodotto', { input });
  },

  async updateCategoria(id: string, input: UpdateCategoriaProdottoInput): Promise<CategoriaProdotto> {
    return await invoke('update_categoria_prodotto', { id, input });
  },

  async deleteCategoria(id: string): Promise<void> {
    return await invoke('delete_categoria_prodotto', { id });
  },

  // ============================================================================
  // PRODOTTI
  // ============================================================================

  async getProdotti(params?: {
    search?: string;
    categoriaId?: string;
    attivoOnly?: boolean;
    soloSottoScorta?: boolean;
    soloInScadenza?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Prodotto[]> {
    return await invoke('get_prodotti', {
      search: params?.search || null,
      categoria_id: params?.categoriaId || null,
      attivo_only: params?.attivoOnly ?? true,
      solo_sotto_scorta: params?.soloSottoScorta || false,
      solo_in_scadenza: params?.soloInScadenza || false,
      limit: params?.limit || null,
      offset: params?.offset || null,
    });
  },

  async getProdotto(id: string): Promise<Prodotto> {
    return await invoke('get_prodotto', { id });
  },

  async getProdottoByBarcode(barcode: string): Promise<Prodotto | null> {
    try {
      return await invoke('get_prodotto_by_barcode', { barcode });
    } catch {
      return null;
    }
  },

  async createProdotto(input: CreateProdottoInput): Promise<Prodotto> {
    return await invoke('create_prodotto', { input });
  },

  async updateProdotto(id: string, input: UpdateProdottoInput): Promise<Prodotto> {
    return await invoke('update_prodotto', { id, input });
  },

  async deactivateProdotto(id: string): Promise<void> {
    return await invoke('deactivate_prodotto', { id });
  },

  async reactivateProdotto(id: string): Promise<void> {
    return await invoke('reactivate_prodotto', { id });
  },

  async deleteProdotto(id: string): Promise<void> {
    return await invoke('delete_prodotto', { id });
  },

  // ============================================================================
  // MOVIMENTI
  // ============================================================================

  async getMovimenti(
    filtri?: FiltriMovimenti,
    limit?: number,
    offset?: number
  ): Promise<MovimentoMagazzino[]> {
    return await invoke('get_movimenti', {
      filtri: filtri || {},
      limit: limit || null,
      offset: offset || null,
    });
  },

  async registraCarico(input: CreateCaricoInput): Promise<MovimentoMagazzino> {
    return await invoke('registra_carico', { input });
  },

  async registraScarico(input: CreateScaricoInput): Promise<MovimentoMagazzino> {
    return await invoke('registra_scarico', { input });
  },

  async registraReso(input: CreateResoInput): Promise<MovimentoMagazzino> {
    return await invoke('registra_reso', { input });
  },

  async registraInventario(input: CreateInventarioInput): Promise<MovimentoMagazzino> {
    return await invoke('registra_inventario', { input });
  },

  // ============================================================================
  // ALERT
  // ============================================================================

  async getAlertProdotti(): Promise<AlertProdotto[]> {
    return await invoke('get_alert_prodotti');
  },

  async getAlertCount(): Promise<AlertCount> {
    return await invoke('get_alert_count');
  },

  async getProdottiSottoScorta(): Promise<Prodotto[]> {
    return await invoke('get_prodotti_sotto_scorta');
  },

  async getProdottiInScadenza(giorni?: number): Promise<Prodotto[]> {
    return await invoke('get_prodotti_in_scadenza', { giorni: giorni || 30 });
  },

  // ============================================================================
  // REPORT
  // ============================================================================

  async getReportConsumi(params: {
    dataDa: string;
    dataA: string;
    categoriaId?: string;
    operatriceId?: string;
    tipo?: 'consumo' | 'vendita';
  }): Promise<ReportConsumiResult[]> {
    return await invoke('get_report_consumi', {
      data_da: params.dataDa,
      data_a: params.dataA,
      categoria_id: params.categoriaId || null,
      operatrice_id: params.operatriceId || null,
      tipo: params.tipo || null,
    });
  },

  async getValoreMagazzino(): Promise<ValoreMagazzino> {
    return await invoke('get_valore_magazzino');
  },

  // ============================================================================
  // INVENTARIO
  // ============================================================================

  async creaSessioneInventario(input: CreateSessioneInventarioInput): Promise<Inventario> {
    return await invoke('crea_sessione_inventario', { input });
  },

  async getInventari(stato?: string): Promise<Inventario[]> {
    return await invoke('get_inventari', { stato: stato || null });
  },

  async getInventario(id: string): Promise<Inventario> {
    return await invoke('get_inventario', { id });
  },

  async getRigheInventario(inventarioId: string): Promise<RigaInventarioWithProdotto[]> {
    return await invoke('get_righe_inventario', { inventario_id: inventarioId });
  },

  async aggiungiRigaInventario(input: CreateRigaInventarioInput): Promise<RigaInventarioWithProdotto> {
    return await invoke('aggiungi_riga_inventario', { input });
  },

  async aggiornaRigaInventario(id: string, input: UpdateRigaInventarioInput): Promise<RigaInventarioWithProdotto> {
    return await invoke('aggiorna_riga_inventario', { id, input });
  },

  async eliminaRigaInventario(id: string): Promise<void> {
    return await invoke('elimina_riga_inventario', { id });
  },

  async cercaProdottoPerInventario(inventarioId: string, search: string): Promise<ProdottoPerInventario[]> {
    return await invoke('cerca_prodotto_per_inventario', { inventario_id: inventarioId, search });
  },

  async confermaInventario(id: string): Promise<InventarioRiepilogo> {
    return await invoke('conferma_inventario', { id });
  },

  async annullaInventario(id: string): Promise<void> {
    return await invoke('annulla_inventario', { id });
  },

  async eliminaInventario(id: string): Promise<void> {
    return await invoke('elimina_inventario', { id });
  },

  // ============================================================================
  // MOVIMENTI PER APPUNTAMENTO
  // ============================================================================

  async getMovimentiAppuntamento(appuntamentoId: string): Promise<MovimentoMagazzino[]> {
    return await invoke('get_movimenti_appuntamento', { appuntamentoId });
  },
};
