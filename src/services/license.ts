import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import type { License, LicenseInfo } from '../types/license';

export const licenseService = {
  /**
   * Importa un file licenza dal file system
   */
  async importLicenseFile(): Promise<License> {
    try {
      // Apri dialog per selezionare file
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Beauty Manager License',
            extensions: ['bmlic', 'json'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        throw new Error('Nessun file selezionato');
      }

      // Leggi contenuto file
      const fileContent = await readTextFile(selected);

      // Importa licenza tramite backend
      const license = await invoke<License>('import_license', {
        licenseFileContent: fileContent,
      });

      return license;
    } catch (error: any) {
      throw new Error(error || 'Errore durante l\'importazione della licenza');
    }
  },

  /**
   * Importa licenza da stringa JSON (per paste da clipboard)
   */
  async importLicenseFromString(licenseJson: string): Promise<License> {
    try {
      const license = await invoke<License>('import_license', {
        licenseFileContent: licenseJson,
      });
      return license;
    } catch (error: any) {
      throw new Error(error || 'Errore durante l\'importazione della licenza');
    }
  },

  /**
   * Valida la licenza corrente
   */
  async validateLicense(): Promise<boolean> {
    try {
      const isValid = await invoke<boolean>('validate_license');
      return isValid;
    } catch (error) {
      console.error('License validation failed:', error);
      return false;
    }
  },

  /**
   * Ottieni informazioni sulla licenza corrente
   */
  async getLicenseInfo(): Promise<LicenseInfo> {
    try {
      const info = await invoke<LicenseInfo>('get_license_info');
      return info;
    } catch (error: any) {
      throw new Error(error || 'Errore durante il recupero delle informazioni sulla licenza');
    }
  },

  /**
   * Rimuovi la licenza corrente
   */
  async removeLicense(): Promise<void> {
    try {
      await invoke('remove_license');
    } catch (error: any) {
      throw new Error(error || 'Errore durante la rimozione della licenza');
    }
  },

  /**
   * Ottieni l'hardware ID del dispositivo corrente
   */
  async getHardwareId(): Promise<string> {
    try {
      const hardwareId = await invoke<string>('get_hardware_id');
      return hardwareId;
    } catch (error: any) {
      throw new Error(error || 'Errore durante il recupero dell\'hardware ID');
    }
  },
};
