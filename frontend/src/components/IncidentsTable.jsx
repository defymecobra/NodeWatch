import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const LevelBadge = ({ level }) => {
  const styles = {
    critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
    error: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    warn: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider", styles[level] || styles.info)}>
      {level}
    </span>
  );
};

const IncidentsTable = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const res = await client.get(`/dashboard/logs?project_id=${projectId}&page=${page}&limit=10`);
        if (res.data.success) {
          setLogs(res.data.logs);
          setTotalPages(res.data.pagination.total_pages);
        }
      } catch (err) {
        console.error('Failed to fetch logs', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [projectId, page]);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="text-xs uppercase bg-dark-900/50 text-slate-500">
            <tr>
              <th scope="col" className="px-6 py-4 font-medium">Level</th>
              <th scope="col" className="px-6 py-4 font-medium w-1/2">Message</th>
              <th scope="col" className="px-6 py-4 font-medium text-center">Occurrences</th>
              <th scope="col" className="px-6 py-4 font-medium">Last Seen</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                  No incidents recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LevelBadge level={log.level} />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-200">
                    <div className="truncate max-w-md" title={log.message}>
                      {log.message}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">
                    {log.occurrence_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(parseISO(log.last_seen_at), 'MMM d, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/incidents/${log.id}`}
                      className="inline-flex items-center text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-sm text-slate-400">
            Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentsTable;
