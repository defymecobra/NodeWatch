import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Globe, Clock, AlertTriangle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const Uptime = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState({}); // { projectId: [checks] }

  const fetchOverview = async () => {
    try {
      const res = await client.get('/system/uptime/overview');
      if (res.data.success) {
        setProjects(res.data.projects);
        // Fetch history for each project found
        res.data.projects.forEach(p => {
          fetchHistory(p.id);
        });
      }
    } catch (err) {
      console.error('Failed to fetch uptime overview', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async (projectId) => {
    try {
      const res = await client.get(`/system/uptime/${projectId}?range=24h`);
      if (res.data.success) {
        setHistory(prev => ({ ...prev, [projectId]: res.data.checks }));
      }
    } catch (err) {
      console.error(`Failed to fetch history for ${projectId}`, err);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Uptime Monitoring</h1>
          <p className="text-slate-400">Availability and response times across your fleet</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Globe className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects configured for monitoring</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Go to Settings and add an Uptime URL to your projects to start tracking their availability.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="glass-panel overflow-hidden border-l-4 border-l-transparent hover:border-l-brand-500 transition-all group">
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={clsx(
                      "p-3 rounded-xl",
                      project.status === 'up' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                      <Activity className={clsx("w-6 h-6", project.status === 'up' && "animate-pulse")} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {project.name}
                        {project.status === 'up' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{project.uptime_url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Status</p>
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                        project.status === 'up' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {project.status || 'Checking...'}
                      </span>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Response</p>
                      <div className="flex items-center justify-end text-white font-mono text-sm">
                        <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                        {project.response_time ? `${project.response_time}ms` : '--'}
                      </div>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Last Check</p>
                      <p className="text-xs text-slate-300">
                        {project.checked_at ? formatDistanceToNow(new Date(project.checked_at), { addSuffix: true }) : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Uptime Timeline */}
                <div className="mt-6">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">24h Availability History</p>
                    <p className="text-[10px] text-slate-500">Last 60 checks</p>
                  </div>
                  <div className="flex gap-1 h-8">
                    {(history[project.id] || Array(60).fill(null)).slice(-60).map((check, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          "flex-1 rounded-sm transition-all hover:scale-y-125 cursor-help",
                          !check ? "bg-slate-800/50" : 
                          check.status === 'up' ? "bg-emerald-500" : "bg-red-500"
                        )}
                        title={check ? `${new Date(check.checked_at).toLocaleTimeString()}: ${check.status.toUpperCase()} (${check.response_time}ms)` : 'No data'}
                      />
                    ))}
                  </div>
                  {project.error_message && project.status === 'down' && (
                    <div className="mt-3 p-2 bg-red-500/5 border border-red-500/10 rounded text-[10px] text-red-400 font-mono">
                      Last Error: {project.error_message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Uptime;
