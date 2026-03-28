import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export const updaterService = {
  async getCurrentVersion(): Promise<string> {
    try {
      return await getVersion();
    } catch {
      return '0.0.0';
    }
  },

  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = await this.getCurrentVersion();

    try {
      const update = await check({
        headers: {
          'Authorization': 'Bearer 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',
          'Accept': 'application/octet-stream',
        },
      });

      if (update) {
        return {
          available: true,
          currentVersion,
          newVersion: update.version,
          releaseNotes: update.body || undefined,
          releaseDate: update.date || undefined,
        };
      }

      return {
        available: false,
        currentVersion,
      };
    } catch (error) {
      console.error('Errore controllo aggiornamenti:', error);
      return {
        available: false,
        currentVersion,
      };
    }
  },

  async downloadAndInstall(
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    try {
      const update = await check({
        headers: {
          'Authorization': 'Bearer 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',
          'Accept': 'application/octet-stream',
        },
      });

      if (!update) {
        return false;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const percentage = contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0;
            if (onProgress) {
              onProgress({ downloaded, total: contentLength, percentage });
            }
            break;
          case 'Finished':
            break;
        }
      });

      return true;
    } catch (error) {
      console.error('Errore download/installazione aggiornamento:', error);
      throw error;
    }
  },

  async restartApp(): Promise<void> {
    try {
      await relaunch();
    } catch (error) {
      console.error('Errore riavvio applicazione:', error);
      throw error;
    }
  },
};
