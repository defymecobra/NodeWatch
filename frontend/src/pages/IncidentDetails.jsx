import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, Server, FileCode, AlertTriangle, ShieldOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

const LevelBadge = ({ level }) => {
  const styles = {
    critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
    error: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    warn: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  return (
    <span className={clsx("px-3 py-1 rounded-full text-sm font-medium uppercase tracking-wider", styles[level] || styles.info)}>
      {level}
    </span>
  );
};

const IncidentDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogDetails = async () => {
      try {
        const res = await client.get(`/dashboard/logs/${id}`);
        if (res.data.success) {
          setLog(res.data.log);
        }
      } catch (err) {
        console.error('Failed to fetch incident details', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-slate-300">Incident not found</h2>
        <Link to="/" className="text-brand-500 hover:underline mt-4 inline-block">Return to Dashboard</Link>
      </div>
    );
  }

  const isGuest = user?.role === 'guest';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link to="/incidents" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Incidents
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <LevelBadge level={log.level} />
              <span className="text-slate-400 text-sm font-mono">{log.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-white break-words">{log.message}</h1>
          </div>
        </div>
      </div>

      {/* Meta info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 flex items-center">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 mr-4">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">First Seen</p>
            <p className="text-slate-200 font-medium">{format(parseISO(log.created_at), 'MMM d, yyyy HH:mm:ss')}</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 mr-4">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Occurrences</p>
            <p className="text-slate-200 font-medium">{log.occurrence_count} times</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 mr-4">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Last Seen</p>
            <p className="text-slate-200 font-medium">{format(parseISO(log.last_seen_at), 'MMM d, yyyy HH:mm:ss')}</p>
          </div>
        </div>
      </div>

      {/* Payload Data — hidden for guests */}
      {isGuest ? (
        <div className="glass-panel p-8 text-center">
          <ShieldOff className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-slate-300 mb-2">Access Restricted</h2>
          <p className="text-slate-500 text-sm">
            Payload and stack trace details are not available for Guest users.
            Contact your administrator for elevated access.
          </p>
        </div>
      ) : (
        log.payload && Object.keys(log.payload).length > 0 && (
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center">
              <FileCode className="w-5 h-5 text-slate-400 mr-2" />
              <h2 className="text-lg font-semibold text-white">Payload & Context</h2>
            </div>
            <div className="p-6 bg-dark-900/50">
              <pre className="text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default IncidentDetails;
