import { useState } from 'react';
import {
  HomeIcon,
  DocumentPlusIcon,
  DocumentDuplicateIcon,
  TagIcon,
  UsersIcon,
  ClockIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  HashtagIcon,
  ComputerDesktopIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import type { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'buat-surat', label: 'Buat Surat', icon: DocumentPlusIcon },
  {
    id: 'template-surat', label: 'Template', icon: DocumentDuplicateIcon,
    children: [
      { id: 'template-surat', label: 'Template Surat', icon: DocumentDuplicateIcon },
      { id: 'placeholder', label: 'Placeholder', icon: TagIcon },
    ],
  },
  { id: 'data-warga', label: 'Data Warga', icon: UsersIcon },
  { id: 'riwayat-surat', label: 'Riwayat Surat', icon: ClockIcon },
  {
    id: 'pengaturan-data-desa', label: 'Pengaturan', icon: Cog6ToothIcon,
    children: [
      { id: 'pengaturan-data-desa', label: 'Data Desa', icon: BuildingOfficeIcon },
      { id: 'pengaturan-nomor-surat', label: 'Nomor Surat', icon: HashtagIcon },
      { id: 'pengaturan-aplikasi', label: 'Aplikasi', icon: ComputerDesktopIcon },
    ],
  },
];

export function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['template-surat', 'pengaturan-data-desa']);

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const isActive = (item: MenuItem): boolean => {
    if (item.id === currentPage) return true;
    if (item.children) return item.children.some(c => c.id === currentPage);
    return false;
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col transition-all duration-200 z-40
      ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
      {/* Logo */}
      <div className="flex items-center h-12 px-3 border-b border-[var(--color-border)]">
        {!collapsed && (
          <span className="font-[var(--font-logo)] text-xl" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-[var(--color-accent)]">AI</span>
            <span className="text-[var(--color-text-primary)]">Sura</span>
          </span>
        )}
        {collapsed && (
          <span className="text-lg mx-auto" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-[var(--color-accent)]">A</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {menuItems.map(item => (
          <div key={item.id + (item.children ? '-parent' : '')}>
            {item.children ? (
              <>
                <button
                  onClick={() => collapsed ? onNavigate(item.children![0].id) : toggleMenu(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                    ${isActive(item) ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]'}`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedMenus.includes(item.id) ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
                {!collapsed && expandedMenus.includes(item.id) && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors
                          ${currentPage === child.id ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]'}`}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                  ${currentPage === item.id ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]'}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] p-2">
        {!collapsed && (
          <div className="flex items-center justify-between px-1 mb-2">
            <div>
              <span className="text-sm" style={{ fontFamily: "'Unica One', cursive" }}>
                <span className="text-[var(--color-accent)]">AI</span>
                <span className="text-[var(--color-text-primary)]">Sura</span>
              </span>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">EAS Creative Studio</p>
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">v1.0.0</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
