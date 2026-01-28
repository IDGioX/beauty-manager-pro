// Tipi per il modulo Magazzino

// === CATEGORIE PRODOTTI ===

export interface CategoriaProdotto {
  id: string;
  codice: string;
  nome: string;
  tipo: 'consumo' | 'rivendita' | 'entrambi' | null;
  created_at: string;
}

export interface CreateCategoriaProdottoInput {
  nome: string;
  tipo: 'consumo' | 'rivendita' | 'entrambi';
}

export interface UpdateCategoriaProdottoInput {
  nome?: string;
  tipo?: 'consumo' | 'rivendita' | 'entrambi';
}

// === PRODOTTI ===

export interface Prodotto {
  id: string;
  codice: string;
  barcode: string | null;
  categoria_id: string | null;
  nome: string;
  descrizione: string | null;
  marca: string | null;
  linea: string | null;
  unita_misura: string;
  capacita: number | null;
  giacenza: number;
  scorta_minima: number;
  scorta_riordino: number;
  prezzo_acquisto: number | null;
  prezzo_vendita: number | null;
  uso: 'interno' | 'vendita' | 'entrambi' | null;
  attivo: boolean;
  data_scadenza: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  // Campi join
  categoria_nome?: string | null;
  categoria_tipo?: string | null;
}

export interface CreateProdottoInput {
  nome: string;
  categoria_id?: string;
  barcode?: string;
  descrizione?: string;
  marca?: string;
  linea?: string;
  unita_misura?: string;
  capacita?: number;
  giacenza?: number;
  scorta_minima?: number;
  scorta_riordino?: number;
  prezzo_acquisto?: number;
  prezzo_vendita?: number;
  uso?: 'interno' | 'vendita' | 'entrambi';
  data_scadenza?: string;
  note?: string;
}

export interface UpdateProdottoInput {
  nome?: string;
  categoria_id?: string;
  barcode?: string;
  descrizione?: string;
  marca?: string;
  linea?: string;
  unita_misura?: string;
  capacita?: number;
  scorta_minima?: number;
  scorta_riordino?: number;
  prezzo_acquisto?: number;
  prezzo_vendita?: number;
  uso?: 'interno' | 'vendita' | 'entrambi';
  data_scadenza?: string;
  note?: string;
  attivo?: boolean;
}

// === MOVIMENTI MAGAZZINO ===

export type TipoMovimento = 'carico' | 'scarico_uso' | 'scarico_vendita' | 'reso' | 'inventario' | 'scarto';

export interface MovimentoMagazzino {
  id: string;
  prodotto_id: string;
  tipo: TipoMovimento;
  quantita: number;
  giacenza_risultante: number;
  appuntamento_id: string | null;
  operatrice_id: string | null;
  cliente_id: string | null;
  fornitore: string | null;
  documento_riferimento: string | null;
  prezzo_unitario: number | null;
  lotto: string | null;
  data_scadenza: string | null;
  note: string | null;
  created_at: string;
  // Campi join
  prodotto_nome?: string | null;
  prodotto_codice?: string | null;
  operatrice_nome?: string | null;
  cliente_nome?: string | null;
}

export interface CreateCaricoInput {
  prodotto_id: string;
  quantita: number;
  fornitore?: string;
  documento_riferimento?: string;
  prezzo_unitario?: number;
  lotto?: string;
  data_scadenza?: string;
  note?: string;
}

export interface CreateScaricoInput {
  prodotto_id: string;
  quantita: number;
  tipo: 'scarico_uso' | 'scarico_vendita' | 'scarto';
  operatrice_id?: string;
  cliente_id?: string;
  appuntamento_id?: string;
  note?: string;
}

export interface CreateResoInput {
  prodotto_id: string;
  quantita: number;
  operatrice_id?: string;
  cliente_id?: string;
  appuntamento_id?: string;
  note?: string;
}

export interface CreateInventarioInput {
  prodotto_id: string;
  nuova_giacenza: number;
  note?: string;
}

// === FILTRI ===

export interface FiltriMovimenti {
  prodotto_id?: string;
  tipo?: TipoMovimento;
  data_da?: string;
  data_a?: string;
  operatrice_id?: string;
  cliente_id?: string;
  fornitore?: string;
}

// === ALERT ===

export interface AlertProdotto {
  id: string;
  codice: string;
  nome: string;
  tipo_alert: 'scorta_minima' | 'scadenza_vicina' | 'scaduto';
  giacenza: number;
  scorta_minima: number;
  data_scadenza: string | null;
  giorni_alla_scadenza: number | null;
}

export interface AlertCount {
  sotto_scorta: number;
  in_scadenza: number;
  scaduti: number;
}

// === REPORT ===

export interface ReportConsumiResult {
  prodotto_id: string;
  prodotto_nome: string;
  prodotto_codice: string;
  categoria_nome: string | null;
  quantita_totale: number;
  valore_totale: number | null;
  numero_movimenti: number;
}

export interface ValoreMagazzino {
  valore_acquisto: number | null;
  valore_vendita: number | null;
  totale_prodotti: number;
  totale_pezzi: number;
}

// === HELPER TYPES ===

export const TIPI_MOVIMENTO_LABELS: Record<TipoMovimento, string> = {
  carico: 'Carico',
  scarico_uso: 'Scarico Uso',
  scarico_vendita: 'Vendita',
  reso: 'Reso',
  inventario: 'Inventario',
  scarto: 'Scarto',
};

export const UNITA_MISURA_OPTIONS = [
  { value: 'pz', label: 'Pezzi' },
  { value: 'ml', label: 'Millilitri' },
  { value: 'l', label: 'Litri' },
  { value: 'g', label: 'Grammi' },
  { value: 'kg', label: 'Kilogrammi' },
  { value: 'conf', label: 'Confezioni' },
];

export const USO_OPTIONS = [
  { value: 'interno', label: 'Uso Interno' },
  { value: 'vendita', label: 'Rivendita' },
  { value: 'entrambi', label: 'Entrambi' },
];

export const TIPO_CATEGORIA_OPTIONS = [
  { value: 'consumo', label: 'Consumo' },
  { value: 'rivendita', label: 'Rivendita' },
  { value: 'entrambi', label: 'Entrambi' },
];

// === INVENTARIO ===

export type StatoInventario = 'in_corso' | 'confermato' | 'annullato';

export interface Inventario {
  id: string;
  codice: string;
  descrizione: string | null;
  data_inizio: string;
  data_chiusura: string | null;
  stato: StatoInventario;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RigaInventario {
  id: string;
  inventario_id: string;
  prodotto_id: string;
  giacenza_teorica: number;
  quantita_contata: number;
  differenza: number;
  lotto: string | null;
  data_scadenza: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RigaInventarioWithProdotto extends RigaInventario {
  prodotto_codice: string | null;
  prodotto_nome: string | null;
  prodotto_barcode: string | null;
  prodotto_marca: string | null;
  prodotto_unita_misura: string | null;
}

export interface CreateSessioneInventarioInput {
  descrizione?: string;
  note?: string;
}

export interface CreateRigaInventarioInput {
  inventario_id: string;
  prodotto_id: string;
  quantita_contata: number;
  lotto?: string;
  data_scadenza?: string;
  note?: string;
}

export interface UpdateRigaInventarioInput {
  quantita_contata?: number;
  lotto?: string;
  data_scadenza?: string;
  note?: string;
}

export interface InventarioRiepilogo {
  totale_righe: number;
  prodotti_contati: number;
  differenze_positive: number;
  differenze_negative: number;
  valore_differenza: number | null;
}

export interface ProdottoPerInventario {
  id: string;
  codice: string;
  barcode: string | null;
  nome: string;
  marca: string | null;
  unita_misura: string;
  giacenza: number;
  gia_inserito: boolean;
}

export const STATO_INVENTARIO_LABELS: Record<StatoInventario, string> = {
  in_corso: 'In Corso',
  confermato: 'Confermato',
  annullato: 'Annullato',
};

export const STATO_INVENTARIO_COLORS: Record<StatoInventario, string> = {
  in_corso: 'bg-yellow-50 text-yellow-700',
  confermato: 'bg-green-50 text-green-700',
  annullato: 'bg-gray-100 text-gray-600',
};
