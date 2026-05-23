import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  DocumentDuplicateIcon,
  UsersIcon,
  ClockIcon,
  DocumentPlusIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [templateCount, setTemplateCount] = useState(0);
  const [wargaCount, setWargaCount] = useState(0);
  const [riwayatCount, setRiwayatCount] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const { getTemplateCount } = await import('../services/templateService');
      const { getWargaCount } = await import('../services/wargaService');
      const { getRiwayatCount } = await import('../services/riwayatService');
      setTemplateCount(await getTemplateCount());
      setWargaCount(await getWargaCount());
      setRiwayatCount(await getRiwayatCount());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Dashboard</h1>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-accent-light)] rounded-md">
                <DocumentDuplicateIcon className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Template Surat</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{templateCount}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                <UsersIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Data Warga</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{wargaCount}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Surat Dibuat</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{riwayatCount}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4"
      >
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Aksi Cepat</h2>
        <div className="flex gap-2">
          <Button size="sm" onPress={() => onNavigate?.('buat-surat')}>
            <DocumentPlusIcon className="w-3.5 h-3.5" /> Buat Surat
          </Button>
          <Button variant="secondary" size="sm" onPress={() => onNavigate?.('data-warga')}>
            <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Import Data Warga
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
