import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { aziendaService } from '../../services/azienda';
import { getVersion } from '@tauri-apps/api/app';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [nomeAzienda, setNomeAzienda] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => { getVersion().then(v => setAppVersion(v)).catch(() => {}); }, []);

  useEffect(() => {
    // Carica il nome dell'azienda
    aziendaService.getAzienda()
      .then(data => {
        if (data.nome_centro && data.nome_centro !== 'Il Mio Centro Estetico') {
          setNomeAzienda(data.nome_centro);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const duration = 3000;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(newProgress);

      if (newProgress < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (onComplete) {
        setTimeout(onComplete, 300);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at top, var(--bg-secondary), var(--bg-base))'
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {/* Logo animato */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="mb-10"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-30"
              style={{ background: 'var(--color-primary)' }}
            />
            <div
              className="relative p-6 rounded-2xl shadow-xl"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
              }}
            >
              <Sparkles size={48} className="text-white" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Titolo */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="text-4xl sm:text-5xl font-bold mb-3 whitespace-nowrap tracking-tight"
          style={{ willChange: 'transform, opacity', color: 'var(--color-text-primary)' }}
        >
          Beauty Manager Pro
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          className="text-base mb-12 leading-relaxed pb-1"
          style={{ willChange: 'transform, opacity', color: 'var(--color-text-secondary)' }}
        >
          Il tuo centro estetico, gestito con intelligenza
        </motion.p>

        {/* Made for section */}
        {nomeAzienda && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
            className="mb-12"
            style={{ willChange: 'transform, opacity' }}
          >
            <p className="text-xs uppercase tracking-[0.2em] mb-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Creato per</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{nomeAzienda}</p>
          </motion.div>
        )}

        {/* Progress bar */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
          className="w-56 origin-left"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                willChange: 'width',
                background: 'var(--color-primary)'
              }}
            />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.8, ease: 'easeOut' }}
            className="text-center text-xs mt-4 tracking-wide"
            style={{ willChange: 'opacity', color: 'var(--color-text-muted)' }}
          >
            Caricamento...
          </motion.p>
        </motion.div>
      </div>

      {/* Version footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 text-xs tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {appVersion ? `v${appVersion}` : ''}
      </motion.div>
    </div>
  );
};
