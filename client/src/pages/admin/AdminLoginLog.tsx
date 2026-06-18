import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAnalyticsApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';

interface LoginLog {
  id: string;
  email: string;
  userId: string | null;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

type StatusFilter = 'all' | 'success' | 'failed';

export function AdminLoginLog() {
  const { t, lang } = useLang();
  const he = lang === 'he';
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const l = {
    title: he ? 'לוג התחברויות' : 'Login Log',
    dateTime: he ? 'תאריך/שעה' : 'Date/Time',
    email: he ? 'אימייל' : 'Email',
    userName: he ? 'שם משתמש' : 'User Name',
    status: he ? 'סטטוס' : 'Status',
    ip: he ? 'כתובת IP' : 'IP Address',
    userAgent: 'User Agent',
    all: he ? 'הכל' : 'All',
    success: he ? 'הצלחה' : 'Success',
    failed: he ? 'נכשל' : 'Failed',
    noLogs: he ? 'אין רשומות' : 'No logs found',
  };

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(he ? 'he-IL' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }),
    [he],
  );

  useEffect(() => { load(); }, [page]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminAnalyticsApi.getLoginLogs({ page, limit: 30 });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }

  const filtered = statusFilter === 'all'
    ? logs
    : logs.filter((log) => (statusFilter === 'success' ? log.success : !log.success));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-7 h-7 text-primary-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{l.title}</h1>
        </div>

        <div className="card p-4 mb-6">
          <select
            className="input w-auto min-w-[150px] text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">{l.all}</option>
            <option value="success">{l.success}</option>
            <option value="failed">{l.failed}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" aria-label={t.common.loading} />
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="text-start py-3 px-3 font-medium">{l.dateTime}</th>
                    <th className="text-start py-3 px-3 font-medium">{l.email}</th>
                    <th className="text-start py-3 px-3 font-medium">{l.userName}</th>
                    <th className="text-start py-3 px-3 font-medium">{l.status}</th>
                    <th className="text-start py-3 px-3 font-medium">{l.ip}</th>
                    <th className="text-start py-3 px-3 font-medium">{l.userAgent}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {dateFmt.format(new Date(log.createdAt))}
                      </td>
                      <td className="py-3 px-3 text-slate-900 dark:text-white">{log.email}</td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{log.user?.name ?? '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.success
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {log.success ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          {log.success ? l.success : l.failed}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-500">{log.ipAddress ?? '—'}</td>
                      <td className="py-3 px-3 text-xs text-slate-400 max-w-[200px] truncate" title={log.userAgent ?? undefined}>
                        {log.userAgent ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">{l.noLogs}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-2">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-500">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost p-2">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
