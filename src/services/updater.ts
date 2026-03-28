import { getVersion } from '@tauri-apps/api/app';

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

const LATEST_URL = 'https://api.github.com/repos/IDGioX/beauty-manager-pro/releases/latest';

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

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
      const res = await fetch(LATEST_URL, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });

      if (!res.ok) return { available: false, currentVersion };

      const release = await res.json();
      const newVersion = (release.tag_name || '').replace(/^v/, '');

      if (!newVersion || compareVersions(newVersion, currentVersion) <= 0) {
        return { available: false, currentVersion };
      }

      // Trova l'exe Windows
      const exeAsset = (release.assets || []).find((a: any) => a.name.endsWith('x64-setup.exe'));

      return {
        available: true,
        currentVersion,
        newVersion,
        releaseNotes: release.body || undefined,
        releaseDate: release.published_at || undefined,
        downloadUrl: exeAsset?.browser_download_url || release.html_url,
      };
    } catch (error) {
      console.error('Errore controllo aggiornamenti:', error);
      return { available: false, currentVersion };
    }
  },

  async downloadAndInstall(
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    try {
      const info = await this.checkForUpdates();
      if (!info.available || !info.downloadUrl) return false;

      // Apri il link di download nel browser
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(info.downloadUrl);

      if (onProgress) {
        onProgress({ downloaded: 100, total: 100, percentage: 100 });
      }

      return true;
    } catch (error) {
      console.error('Errore download aggiornamento:', error);
      throw error;
    }
  },

  async restartApp(): Promise<void> {
    // Non serve riavviare — l'utente installa manualmente il nuovo exe
  },
};
