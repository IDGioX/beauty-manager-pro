import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthGuard } from "./components/auth/AuthGuard";
import { LicenseGuard } from "./components/license/LicenseGuard";
import { ToastContainer } from "./components/ui/Toast";
import { WhatsNewModal } from "./components/WhatsNewModal";
import { changelogService, type ReleaseInfo } from "./services/changelog";
import { useAgendaStore } from "./stores/agendaStore";

// Error Boundary per catturare crash React
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('React crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1a1a2e', color: '#e94560', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Errore nell'applicazione</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, background: '#16213e', padding: 20, borderRadius: 8, color: '#fff' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            Ricarica App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load all pages — each becomes a separate chunk
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Clienti = lazy(() => import("./pages/Clienti").then(m => ({ default: m.Clienti })));
const Agenda = lazy(() => import("./pages/Agenda").then(m => ({ default: m.Agenda })));
const Operatrici = lazy(() => import("./pages/Operatrici").then(m => ({ default: m.Operatrici })));
const Trattamenti = lazy(() => import("./pages/Trattamenti").then(m => ({ default: m.Trattamenti })));
const Magazzino = lazy(() => import("./pages/Magazzino").then(m => ({ default: m.Magazzino })));
const Comunicazioni = lazy(() => import("./pages/Comunicazioni").then(m => ({ default: m.Comunicazioni })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Report = lazy(() => import("./pages/Report").then(m => ({ default: m.Report })));
const Insights = lazy(() => import("./pages/Insights").then(m => ({ default: m.Insights })));
const Pacchetti = lazy(() => import("./pages/Pacchetti").then(m => ({ default: m.Pacchetti })));

type PageType = 'dashboard' | 'agenda' | 'clienti' | 'operatrici' | 'trattamenti' | 'magazzino' | 'comunicazioni' | 'report' | 'insights' | 'pacchetti' | 'settings';

const pageTitles: Record<PageType, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda Appuntamenti',
  clienti: 'Gestione Clienti',
  operatrici: 'Gestione Operatori',
  trattamenti: 'Catalogo Trattamenti',
  magazzino: 'Magazzino Prodotti',
  comunicazioni: 'Comunicazioni',
  report: 'Report e Analytics',
  insights: 'Insights',
  pacchetti: 'Pacchetti Trattamenti',
  settings: 'Impostazioni',
};

// Minimal loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [previousPage, setPreviousPage] = useState<PageType | null>(null);
  const [pendingAppuntamentoId, setPendingAppuntamentoId] = useState<string | null>(null);
  const [pendingClienteId, setPendingClienteId] = useState<string | null>(null);
  const [pendingPacchettiClienteId, setPendingPacchettiClienteId] = useState<string | null>(null);
  const [backToAppuntamentoId, setBackToAppuntamentoId] = useState<string | null>(null);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const setAgendaDate = useAgendaStore(s => s.setSelectedDate);

  // Controlla se mostrare popup "Novita" dopo aggiornamento
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (await changelogService.shouldShowWhatsNew()) {
          const info = await changelogService.fetchReleaseNotes();
          setReleaseInfo(info);
          setWhatsNewOpen(true);
        }
      } catch (e) {
        console.error('Errore controllo novita:', e);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleWhatsNewClose = () => {
    setWhatsNewOpen(false);
    if (releaseInfo) {
      changelogService.setLastSeenVersion(releaseInfo.version);
    }
  };

  // Handler per navigare all'Agenda con un appuntamento specifico
  const navigateToAgendaWithAppuntamento = (appuntamentoId: string) => {
    setPendingAppuntamentoId(appuntamentoId);
    setCurrentPage('agenda');
  };

  // Handler per navigare ai Clienti con un cliente specifico
  const navigateToClientiWithCliente = useCallback((clienteId: string) => {
    setPendingClienteId(clienteId);
    setCurrentPage('clienti');
  }, []);

  // Callback per tornare all'appuntamento di provenienza
  const handleGoBackToAppuntamento = useCallback(() => {
    if (backToAppuntamentoId) {
      setPendingAppuntamentoId(backToAppuntamentoId);
      setBackToAppuntamentoId(null);
      setCurrentPage('agenda');
    }
  }, [backToAppuntamentoId]);

  // Global navigation event listener (used by modals that don't have direct access to navigation)
  useEffect(() => {
    const handleNavigateToPage = (event: Event) => {
      const { page, clienteId, appuntamentoId, fromAppuntamentoId } = (event as CustomEvent).detail;

      // Se la navigazione proviene da un appuntamento, salva il contesto per il "torna indietro"
      if (fromAppuntamentoId) {
        setBackToAppuntamentoId(fromAppuntamentoId);
      }

      if (page === 'pacchetti' && clienteId) {
        setPendingPacchettiClienteId(clienteId);
        setCurrentPage('pacchetti');
      } else if (clienteId) {
        setPendingClienteId(clienteId);
        setCurrentPage('clienti');
      } else if (appuntamentoId) {
        setPendingAppuntamentoId(appuntamentoId);
        setBackToAppuntamentoId(null);
        setCurrentPage('agenda');
      } else if (page) {
        setCurrentPage(page as PageType);
      }
    };
    window.addEventListener('navigateToPage', handleNavigateToPage);
    return () => window.removeEventListener('navigateToPage', handleNavigateToPage);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(page) => {
              if (page === 'agenda') setAgendaDate(new Date());
              setCurrentPage(page as PageType);
            }}
            onOpenAppuntamento={navigateToAgendaWithAppuntamento}
            onOpenCliente={navigateToClientiWithCliente}
          />
        );
      case 'agenda':
        return <Agenda openAppuntamentoId={pendingAppuntamentoId} onAppuntamentoOpened={() => setPendingAppuntamentoId(null)} />;
      case 'clienti':
        return <Clienti openClienteId={pendingClienteId} onClienteOpened={() => setPendingClienteId(null)} onGoBack={backToAppuntamentoId ? handleGoBackToAppuntamento : undefined} />;
      case 'operatrici':
        return <Operatrici onGoBack={backToAppuntamentoId ? handleGoBackToAppuntamento : undefined} />;
      case 'trattamenti':
        return <Trattamenti onGoBack={backToAppuntamentoId ? handleGoBackToAppuntamento : undefined} />;
      case 'magazzino':
        return <Magazzino onNavigateToAgenda={navigateToAgendaWithAppuntamento} />;
      case 'comunicazioni':
        return <Comunicazioni />;
      case 'report':
        return <Report />;
      case 'insights':
        return <Insights />;
      case 'pacchetti':
        return <Pacchetti openClienteId={pendingPacchettiClienteId} onClienteOpened={() => setPendingPacchettiClienteId(null)} onGoBack={backToAppuntamentoId ? handleGoBackToAppuntamento : undefined} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
    <LicenseGuard>
      <ThemeProvider>
        <AuthGuard>
          <MainLayout
            currentPage={currentPage}
            pageTitle={pageTitles[currentPage]}
            previousPage={previousPage}
            onNavigate={(page) => { setBackToAppuntamentoId(null); setPreviousPage(currentPage); setCurrentPage(page as PageType); }}
            onGoBack={previousPage ? () => { const prev = previousPage; setPreviousPage(null); setCurrentPage(prev); } : undefined}
          >
            <Suspense fallback={<PageLoader />}>
              {renderPage()}
            </Suspense>
          </MainLayout>
          {releaseInfo && (
            <WhatsNewModal
              isOpen={whatsNewOpen}
              onClose={handleWhatsNewClose}
              releaseInfo={releaseInfo}
            />
          )}
          <ToastContainer />
        </AuthGuard>
      </ThemeProvider>
    </LicenseGuard>
    </ErrorBoundary>
  );
}

export default App;
