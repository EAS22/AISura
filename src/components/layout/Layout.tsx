import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { HeaderBar } from './HeaderBar';
import type { PageId } from '../../types';

interface LayoutProps {
  children: ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
}

export function Layout({ children, currentPage, onNavigate, onLogout }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'ml-[60px]' : 'ml-[220px]'}`}>
        <HeaderBar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
