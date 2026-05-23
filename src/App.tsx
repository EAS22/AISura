import { useState, useEffect } from 'react';
import { initDatabase } from './services/db';
import { hasPassword, getDisplayName } from './services/authService';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BuatSurat } from './pages/BuatSurat';
import { TemplateSuratPage } from './pages/TemplateSurat';
import { PlaceholderPage } from './pages/Placeholder';
import { DataWarga } from './pages/DataWarga';
import { RiwayatSuratPage } from './pages/RiwayatSurat';
import { DataDesaPage } from './pages/pengaturan/DataDesa';
import { NomorSuratPage } from './pages/pengaturan/NomorSurat';
import { AplikasiPage } from './pages/pengaturan/Aplikasi';
import { Profil } from './pages/Profil';
import type { PageId } from './types';

function App() {
  const [isReady, setIsReady] = useState(false);
  const { status, setStatus, setDisplayName } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        const passwordExists = await hasPassword();
        if (passwordExists) {
          const name = await getDisplayName();
          setDisplayName(name);
          setStatus('login');
        } else {
          setStatus('setup');
        }
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
        setStatus('setup');
        setIsReady(true);
      }
    };
    bootstrap();
  }, [setStatus, setDisplayName]);

  const handleLoginSuccess = async () => {
    try {
      const name = await getDisplayName();
      setDisplayName(name);
    } catch { /* ignore */ }
    setStatus('authenticated');
  };

  const handleLogout = () => {
    setStatus('login');
    setCurrentPage('dashboard');
  };

  if (!isReady || status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <span className="text-2xl" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-[var(--color-accent)]">AI</span>
            <span className="text-[var(--color-text-primary)]">Sura</span>
          </span>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'setup' || status === 'login') {
    return <Login isSetup={status === 'setup'} onSuccess={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={(p) => setCurrentPage(p as PageId)} />;
      case 'buat-surat': return <BuatSurat />;
      case 'template-surat': return <TemplateSuratPage />;
      case 'placeholder': return <PlaceholderPage />;
      case 'data-warga': return <DataWarga />;
      case 'riwayat-surat': return <RiwayatSuratPage />;
      case 'pengaturan-data-desa': return <DataDesaPage />;
      case 'pengaturan-nomor-surat': return <NomorSuratPage />;
      case 'pengaturan-aplikasi': return <AplikasiPage />;
      case 'profil': return <Profil />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
