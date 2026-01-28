import { invoke } from '@tauri-apps/api/core';

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface BackupConfig {
  enabled: boolean;
  frequency: BackupFrequency;
  max_backups: number;
  last_backup: string | null;
}

export const configService = {
  async getBackupConfig(): Promise<BackupConfig> {
    return await invoke('get_backup_config');
  },

  async updateBackupConfig(config: BackupConfig): Promise<BackupConfig> {
    return await invoke('update_backup_config', { backupConfig: config });
  },

  async triggerManualBackup(): Promise<void> {
    return await invoke('trigger_manual_backup');
  },
};
