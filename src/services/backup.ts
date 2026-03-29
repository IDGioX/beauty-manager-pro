import { invoke } from '@tauri-apps/api/core';

export interface BackupMetadata {
  version: string;
  created_at: string;
  app_version: string;
  database_size: number;
  description?: string;
}

export interface BackupInfo {
  file_path: string;
  file_name: string;
  created_at: string;
  size: number;
  metadata: BackupMetadata;
}

export type RestoreMode = 'smart' | 'full';

export interface RestoreResult {
  metadata: BackupMetadata;
  tables_restored: string[];
  tables_skipped: string[];
  mode: string;
  requires_relaunch: boolean;
}

export const backupService = {
  async createBackup(description?: string): Promise<string> {
    return await invoke('create_backup', { description });
  },

  async restoreBackup(backupPath: string): Promise<BackupMetadata> {
    return await invoke('restore_backup', { backupPath });
  },

  async listBackups(): Promise<BackupInfo[]> {
    return await invoke('list_backups');
  },

  async deleteBackup(backupPath: string): Promise<void> {
    return await invoke('delete_backup', { backupPath });
  },

  async exportBackupToFolder(destinationPath: string, description?: string): Promise<string> {
    return await invoke('export_backup_to_folder', { destinationPath, description });
  },

  async importBackupFromFile(sourcePath: string): Promise<BackupMetadata> {
    return await invoke('import_backup_from_file', { sourcePath });
  },

  async openBackupFolder(): Promise<void> {
    return await invoke('open_backup_folder');
  },

  async restoreBackupSmart(backupPath: string, restoreMode: RestoreMode): Promise<RestoreResult> {
    return await invoke('restore_backup_smart', { backupPath, restore_mode: restoreMode });
  },

  async restoreBackupFirstSetup(backupPath: string): Promise<RestoreResult> {
    return await invoke('restore_backup_first_setup', { backupPath });
  },
};
