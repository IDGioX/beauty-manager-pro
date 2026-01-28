// Tipi TypeScript per esportazione agenda

export interface ExportAgendaInput {
  data_inizio: string; // ISO string
  data_fine: string;   // ISO string
  operatrici_ids: string[];
  file_path: string;
}

export interface ExportResult {
  file_path: string;
  file_size: number;
}
