import { invoke } from '@tauri-apps/api/core';
import type { License, LicenseInfo, GeneratedKey } from '../types/license';

function extractError(error: unknown, fallback: string): Error {
  if (typeof error === 'string') return new Error(error);
  if (error && typeof error === 'object' && 'message' in error) return new Error(String((error as any).message));
  return new Error(fallback);
}

export const licenseService = {
  async activateLicense(key: string, customerName?: string): Promise<License> {
    try {
      return await invoke<License>('activate_license', { key, customerName });
    } catch (error) {
      throw extractError(error, 'Errore durante l\'attivazione della licenza');
    }
  },

  async validateLicense(): Promise<boolean> {
    try {
      return await invoke<boolean>('validate_license');
    } catch (error) {
      console.error('License validation failed:', error);
      return false;
    }
  },

  async getLicenseInfo(): Promise<LicenseInfo> {
    try {
      return await invoke<LicenseInfo>('get_license_info');
    } catch (error) {
      throw extractError(error, 'Errore durante il recupero delle informazioni sulla licenza');
    }
  },

  async removeLicense(): Promise<void> {
    try {
      await invoke('remove_license');
    } catch (error) {
      throw extractError(error, 'Errore durante la rimozione della licenza');
    }
  },

  async generateLicenseKey(licenseType: string, durataMesi?: number): Promise<GeneratedKey> {
    try {
      return await invoke<GeneratedKey>('generate_license_key', { licenseType, durataMesi });
    } catch (error) {
      throw extractError(error, 'Errore durante la generazione della chiave');
    }
  },
};
