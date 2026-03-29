import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ArrowLeft } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  currentPage: string;
  pageTitle: string;
  previousPage?: string | null;
  onNavigate: (page: string) => void;
  onGoBack?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentPage,
  pageTitle,
  previousPage,
  onNavigate,
  onGoBack,
}) => {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--bg-base) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%)`,
      }}
    >
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Top right decorative orb */}
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }}
        />
        {/* Bottom left decorative orb */}
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: `radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)` }}
        />
        {/* Center decorative orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)` }}
        />
      </div>

      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header title={pageTitle} onNavigate={onNavigate} />

        {/* Tasto indietro globale */}
        {onGoBack && previousPage && (
          <div className="px-6 pt-2 pb-0">
            <button
              onClick={onGoBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
              style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}
            >
              <ArrowLeft size={13} /> Torna indietro
            </button>
          </div>
        )}

        <main className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="animate-in flex-1 flex flex-col min-h-0 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
