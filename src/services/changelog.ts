import { getVersion } from '@tauri-apps/api/app';

const STORAGE_KEY = 'bmp_last_seen_version';
const RELEASE_URL = 'https://api.github.com/repos/IDGioX/beauty-manager-pro/releases/latest';

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

export const changelogService = {
  async getCurrentVersion(): Promise<string> {
    try {
      return await getVersion();
    } catch {
      return '0.0.0';
    }
  },

  getLastSeenVersion(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },

  setLastSeenVersion(version: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      // localStorage non disponibile
    }
  },

  async shouldShowWhatsNew(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();
    const lastSeen = this.getLastSeenVersion();

    // Prima installazione: salva versione, non mostrare popup
    if (lastSeen === null) {
      this.setLastSeenVersion(currentVersion);
      return false;
    }

    // Stessa versione: non mostrare
    if (lastSeen === currentVersion) {
      return false;
    }

    // Versione diversa (aggiornamento): salva subito e mostra popup
    this.setLastSeenVersion(currentVersion);
    return true;
  },

  async fetchReleaseNotes(): Promise<ReleaseInfo> {
    const currentVersion = await this.getCurrentVersion();

    try {
      const res = await fetch(RELEASE_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (!res.ok) throw new Error('GitHub API error');

      const release = await res.json();

      return {
        version: (release.tag_name || '').replace(/^v/, '') || currentVersion,
        releaseDate: release.published_at || new Date().toISOString(),
        releaseNotes: release.body || `### Aggiornamento v${currentVersion}\n\nMiglioramenti e correzioni.`,
      };
    } catch {
      // Fallback offline
      return {
        version: currentVersion,
        releaseDate: new Date().toISOString(),
        releaseNotes: `### Aggiornamento v${currentVersion}\n\nL'app e stata aggiornata alla versione ${currentVersion}.\n\n- Miglioramenti alle prestazioni\n- Correzioni di bug`,
      };
    }
  },

  async generatePdf(version: string, releaseDate: string, releaseNotes: string): Promise<void> {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const outputPath = await save({
        title: 'Salva PDF Novita',
        defaultPath: `Novita_BMP_v${version}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (!outputPath) return;

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('generate_changelog_pdf', {
        version,
        releaseDate,
        releaseNotes,
        outputPath,
      });
    } catch (error) {
      console.error('Errore generazione PDF changelog:', error);
      throw error;
    }
  },
};
