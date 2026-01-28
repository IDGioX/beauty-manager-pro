export interface LicenseFile {
  license_key: string;
  customer_name?: string;
  customer_email?: string;
  license_type: 'trial' | 'monthly' | 'annual' | 'lifetime' | 'custom';
  issued_at: string;
  expires_at?: string; // undefined for lifetime
  hardware_id?: string; // Se specificato, bind a questo device
  features: string[];
  notes?: string;
  signature: string;
}

export interface License {
  id: string;
  license_key: string;
  customer_name?: string;
  customer_email?: string;
  license_type: string;
  status: string;
  issued_at: string;
  activated_at: string;
  expires_at?: string;
  hardware_id?: string;
  features?: string;
  notes?: string;
  signature: string;
  created_at: string;
  updated_at: string;
}

export interface LicenseInfo {
  has_license: boolean;
  license_type?: string;
  customer_name?: string;
  status?: string;
  expires_at?: string;
  days_remaining?: number;
  is_trial: boolean;
}
