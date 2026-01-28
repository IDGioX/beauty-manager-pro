import React, { useEffect, useState } from 'react';
import { licenseService } from '../../services/license';
import { LicenseActivation } from '../../pages/LicenseActivation';
import { Key } from 'lucide-react';

interface LicenseGuardProps {
  children: React.ReactNode;
}

export const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const valid = await licenseService.validateLicense();
      setIsValid(valid);
    } catch (error) {
      console.error('License validation failed:', error);
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-purple-600">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <Key size={40} className="text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Beauty Manager Pro</h2>
          <p className="text-white/80">Verifica licenza in corso...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return <LicenseActivation />;
  }

  return <>{children}</>;
};
