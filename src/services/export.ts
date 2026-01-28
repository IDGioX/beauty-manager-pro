// Service per esportazione agenda

import { invoke } from '@tauri-apps/api/core';
import type { ExportAgendaInput, ExportResult } from '../types/export';

export const exportService = {
  async exportAgendaExcel(input: ExportAgendaInput): Promise<ExportResult> {
    return await invoke('export_agenda_excel', { input });
  },

  async exportAgendaPdf(input: ExportAgendaInput): Promise<ExportResult> {
    return await invoke('export_agenda_pdf', { input });
  },
};
