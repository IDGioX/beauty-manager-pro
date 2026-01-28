import { check, type Update } from '@tauri-apps/plugin-updater';
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
  /**
   * Ottiene la versione corrente dell'app
   */
  async getCurrentVersion(): Promise<string> {
    try {
      return await getVersion();
    } catch {
      return '0.0.0';
    }
  },

  /**
   * Controlla se sono disponibili aggiornamenti
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = await this.getCurrentVersion();

    try {
      const update = await check();

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

  /**
   * Scarica e installa l'aggiornamento
   */
  async downloadAndInstall(
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    try {
      const update = await check();

      if (!update) {
        console.log('Nessun aggiornamento disponibile');
        return false;
      }

      let downloaded = 0;
      let contentLength = 0;

      // Download con progress tracking
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(`Download iniziato: ${contentLength} bytes`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const percentage = contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0;

            if (onProgress) {
              onProgress({
                downloaded,
                total: contentLength,
                percentage,
              });
            }
            break;
          case 'Finished':
            console.log('Download completato');
            break;
        }
      });

      console.log('Aggiornamento installato, pronto per riavvio');
      return true;
    } catch (error) {
      console.error('Errore download/installazione aggiornamento:', error);
      throw error;
    }
  },

  /**
   * Riavvia l'applicazione per applicare l'aggiornamento
   */
  async restartApp(): Promise<void> {
    try {
      await relaunch();
    } catch (error) {
      console.error('Errore riavvio applicazione:', error);
      throw error;
    }
  },
};
