export interface License {
  id: string;
  license_key: string;
  customer_name?: string;
  license_type: string;
  status: string;
  issued_at: string;
  activated_at: string;
  expires_at?: string;
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

export interface GeneratedKey {
  key: string;
  license_type: string;
  expires_at: string | null;
}
