import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAuditApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import type { AuditLog } from '../../types/admin';

export function AdminAudit() {
  const { t, dateLocale } = useLang();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { load(); }, [page, entityFilter, actionFilter]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminAuditApi.getAll({
        page,
        limit: 30,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.auditLog}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.auditLogDesc}</p>
        </div>

        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input ps-10 text-sm"
                placeholder={t.admin.filterByAction}
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="input w-auto min-w-[150px] text-sm"
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t.admin.allEntities}</option>
              <option value="User">User</option>
              <option value="Role">Role</option>
              <option value="BoardStatus">BoardStatus</option>
              <option value="BoardPriority">BoardPriority</option>
              <option value="Category">Category</option>
              <option value="NavItem">NavItem</option>
              <option value="CustomPage">CustomPage</option>
              <option value="SystemSetting">SystemSetting</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => {
                let details: Record<string, unknown> | null = null;
                try { if (log.details) details = JSON.parse(log.details); } catch { /* ignore */ }

                return (
                  <div key={log.id} className="card p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{log.user.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-mono">{log.action}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{log.entity}</span>
                        </div>
                        {details && (
                          <div className="mt-1 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 overflow-x-auto">
                            {JSON.stringify(details, null, 0).slice(0, 300)}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString(dateLocale)}</span>
                          {log.ipAddress && <span className="text-xs text-slate-400 font-mono">{log.ipAddress}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="card p-12 text-center">
                  <p className="text-slate-400">{t.admin.noLogs}</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost p-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-500">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost p-2"
                >
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
