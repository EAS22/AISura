import { SunIcon, MoonIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { useClock } from '../../hooks/useClock';
import { useAuth } from '../../hooks/useAuth';
import { SearchField } from '../ui/SearchField';
import type { PageId } from '../../types';

interface HeaderBarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
}

const PAGE_LABELS: Record<PageId, string> = {
  'dashboard': 'Dashboard',
  'buat-surat': 'Buat Surat',
  'template-surat': 'Template Surat',
  'placeholder': 'Placeholder',
  'data-warga': 'Data Warga',
  'riwayat-surat': 'Riwayat Surat',
  'pengaturan-data-desa': 'Data Desa',
  'pengaturan-nomor-surat': 'Nomor Surat',
  'pengaturan-aplikasi': 'Aplikasi',
  'profil': 'Profil',
};

const BREADCRUMBS: Partial<Record<PageId, string[]>> = {
  'template-surat': ['Template', 'Template Surat'],
  'placeholder': ['Template', 'Placeholder'],
  'pengaturan-data-desa': ['Pengaturan', 'Data Desa'],
  'pengaturan-nomor-surat': ['Pengaturan', 'Nomor Surat'],
  'pengaturan-aplikasi': ['Pengaturan', 'Aplikasi'],
};

export function HeaderBar({ currentPage, onNavigate, onLogout }: HeaderBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { date, time } = useClock();
  const { displayName } = useAuth();

  const breadcrumb = BREADCRUMBS[currentPage];
  const pageLabel = PAGE_LABELS[currentPage] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 h-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-3 gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs min-w-0">
        {breadcrumb ? (
          breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[var(--color-text-tertiary)]">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-tertiary)]'}>
                {crumb}
              </span>
            </span>
          ))
        ) : (
          <span className="text-[var(--color-text-primary)] font-medium">{pageLabel}</span>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs mx-auto">
        <SearchField placeholder="Cari halaman..." className="w-full" />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>

        <span className="text-[11px] text-[var(--color-text-tertiary)] tabular-nums">
          {date} {time}
        </span>

        <div className="relative group">
          <button className="flex items-center gap-1 p-1 rounded-md hover:bg-[var(--color-surface-secondary)] transition-colors">
            <UserCircleIcon className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{displayName}</p>
            </div>
            <button
              onClick={() => onNavigate('profil')}
              className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              Profil
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
