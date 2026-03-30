import { getVersion } from '@tauri-apps/api/app';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
  downloadUrl?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

// Cache dell'update trovato per il download successivo
let pendingUpdate: Update | null = null;

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
      // Usa il plugin nativo Tauri updater
      const update = await check();

      if (update) {
        pendingUpdate = update;
        return {
          available: true,
          currentVersion,
          newVersion: update.version,
          releaseNotes: update.body || undefined,
          releaseDate: update.date || undefined,
        };
      }

      return { available: false, currentVersion };
    } catch (error) {
      console.error('Errore controllo aggiornamenti (plugin):', error);

      // Fallback: check via GitHub API
      try {
        const res = await fetch('https://api.github.com/repos/IDGioX/beauty-manager-pro/releases/latest', {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
        });
        if (!res.ok) return { available: false, currentVersion };
        const release = await res.json();
        const newVersion = (release.tag_name || '').replace(/^v/, '');
        const pa = currentVersion.split('.').map(Number);
        const pb = newVersion.split('.').map(Number);
        let isNewer = false;
        for (let i = 0; i < 3; i++) {
          if ((pb[i] || 0) > (pa[i] || 0)) { isNewer = true; break; }
          if ((pb[i] || 0) < (pa[i] || 0)) break;
        }
        if (!isNewer) return { available: false, currentVersion };
        return {
          available: true,
          currentVersion,
          newVersion,
          releaseNotes: release.body || undefined,
          releaseDate: release.published_at || undefined,
          downloadUrl: release.html_url,
        };
      } catch {
        return { available: false, currentVersion };
      }
    }
  },

  async downloadAndInstall(
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    try {
      // Se abbiamo un update dal plugin nativo, usiamo quello
      if (pendingUpdate) {
        let downloaded = 0;
        let total = 0;

        await pendingUpdate.downloadAndInstall((event) => {
          if (event.event === 'Started' && event.data.contentLength) {
            total = event.data.contentLength;
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength;
            if (onProgress && total > 0) {
              onProgress({ downloaded, total, percentage: Math.round((downloaded / total) * 100) });
            }
          } else if (event.event === 'Finished') {
            if (onProgress) onProgress({ downloaded: total, total, percentage: 100 });
          }
        });

        return true;
      }

      // Fallback: apri nel browser
      const info = await this.checkForUpdates();
      if (!info.available || !info.downloadUrl) return false;
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(info.downloadUrl);
      return true;
    } catch (error) {
      console.error('Errore download aggiornamento:', error);
      throw error;
    }
  },

  async restartApp(): Promise<void> {
    try {
      await relaunch();
    } catch {
      window.location.reload();
    }
  },
};
