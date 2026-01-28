import { useState } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Clienti } from "./pages/Clienti";
import { Agenda } from "./pages/Agenda";
import { Operatrici } from "./pages/Operatrici";
import { Trattamenti } from "./pages/Trattamenti";
import { Magazzino } from "./pages/Magazzino";
import { Comunicazioni } from "./pages/Comunicazioni";
import { Settings } from "./pages/Settings";
import { Report } from "./pages/Report";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthGuard } from "./components/auth/AuthGuard";
import { LicenseGuard } from "./components/license/LicenseGuard";

type PageType = 'dashboard' | 'agenda' | 'clienti' | 'operatrici' | 'trattamenti' | 'magazzino' | 'comunicazioni' | 'report' | 'settings';

const pageTitles: Record<PageType, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda Appuntamenti',
  clienti: 'Gestione Clienti',
  operatrici: 'Gestione Operatori',
  trattamenti: 'Catalogo Trattamenti',
  magazzino: 'Magazzino Prodotti',
  comunicazioni: 'Comunicazioni',
  report: 'Report e Analytics',
  settings: 'Impostazioni',
};

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [pendingAppuntamentoId, setPendingAppuntamentoId] = useState<string | null>(null);

  // Handler per navigare all'Agenda con un appuntamento specifico
  const navigateToAgendaWithAppuntamento = (appuntamentoId: string) => {
    setPendingAppuntamentoId(appuntamentoId);
    setCurrentPage('agenda');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'agenda':
        return <Agenda openAppuntamentoId={pendingAppuntamentoId} onAppuntamentoOpened={() => setPendingAppuntamentoId(null)} />;
      case 'clienti':
        return <Clienti />;
      case 'operatrici':
        return <Operatrici />;
      case 'trattamenti':
        return <Trattamenti />;
      case 'magazzino':
        return <Magazzino onNavigateToAgenda={navigateToAgendaWithAppuntamento} />;
      case 'comunicazioni':
        return <Comunicazioni />;
      case 'report':
        return <Report />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <LicenseGuard>
      <ThemeProvider>
        <AuthGuard>
          <MainLayout
            currentPage={currentPage}
            pageTitle={pageTitles[currentPage]}
            onNavigate={(page) => setCurrentPage(page as PageType)}
          >
            {renderPage()}
          </MainLayout>
        </AuthGuard>
      </ThemeProvider>
    </LicenseGuard>
  );
}

export default App;
