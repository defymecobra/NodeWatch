import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import StatsCard from '../components/StatsCard';
import ErrorsChart from '../components/ErrorsChart';
import IncidentsTable from '../components/IncidentsTable';
import AdminControls from '../components/AdminControls';
import { AlertTriangle, Activity, DatabaseZap, Clock, ArrowRight, BarChart3, Cpu, Server, Database } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const LEVEL_COLORS = { critical: '#ef4444', error: '#f97316', warn: '#eab308', info: '#3b82f6' };

const AnalyticsBanner = ({ projectId }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pid = projectId || 'all';
        const res = await client.get(`/analytics/overview?range=7d&project_id=${pid}`);
        if (res.data.success) setData(res.data.overview);
      } catch (err) { /* silent */ }
    };
    fetchData();
  }, [projectId]);

  const pieData = (data?.by_level || []).map(item => ({
    name: item.level,
    value: parseInt(item.count),
  }));

  const totalErrors = data?.totals?.total_errors || 0;
  const projectCount = data?.totals?.active_projects || 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-r from-dark-900 via-dark-800 to-brand-900/20">
      {/* Decorative glow */}
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6">
        {/* Mini Pie Chart */}
        <div className="w-28 h-28 shrink-0">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={28} outerRadius={48}
                  paddingAngle={3} dataKey="value" stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={LEVEL_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full rounded-full border-4 border-slate-700 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-slate-600" />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-white mb-1">Cross-Project Analytics</h3>
          <p className="text-sm text-slate-400">
            {totalErrors > 0
              ? `${totalErrors} errors across ${projectCount} project${projectCount !== 1 ? 's' : ''} in the last 7 days. View heatmaps, health scores, and trends.`
              : 'Explore error patterns, project health scores, and heatmaps across all your projects.'
            }
          </p>
          {/* Mini legend */}
          {pieData.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2">
              {pieData.map(entry => (
                <span key={entry.name} className="flex items-center gap-1 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[entry.name] }} />
                  {entry.name}: {entry.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Link
          to="/analytics"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold hover:from-brand-600 hover:to-brand-500 transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40"
        >
          View Analytics
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await client.get('/dashboard/projects');
        if (res.data.success && res.data.projects.length > 0) {
          setProjects(res.data.projects);
          setSelectedProjectId('all'); // Default to All Projects
        }
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch stats when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await client.get(`/dashboard/stats?project_id=${selectedProjectId}`);
        if (res.data.success) {
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [selectedProjectId, refreshKey]);

  return (
    <div className="space-y-6">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1.5">Real-time error monitoring and cross-project analytics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {projects.length > 0 && (
            <div className="relative group min-w-[240px]">
              <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-xl group-hover:bg-brand-500/30 transition-all duration-300"></div>
              <div className="relative flex items-center bg-dark-800/80 border border-brand-500/30 rounded-xl overflow-hidden backdrop-blur-sm hover:border-brand-500/50 transition-colors">
                <div className="pl-4 pr-2 py-3 flex items-center text-brand-400">
                  <DatabaseZap className="w-5 h-5" />
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-transparent text-white font-medium text-base appearance-none py-3 pr-10 pl-2 outline-none cursor-pointer w-full"
                >
                  <option value="all" className="bg-dark-900 text-brand-400 font-semibold">All Projects</option>
                  <option disabled className="bg-dark-900 text-slate-500">──────────</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-dark-900 text-slate-200">{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 pointer-events-none text-brand-400/70 group-hover:text-brand-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          <AdminControls projectId={selectedProjectId} onEventSent={() => setRefreshKey(k => k + 1)} />
        </div>
      </div>

      {isLoading && !stats ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard 
              title="Total Errors (24h)" 
              value={stats.errors_last_24h} 
              icon={Activity} 
              colorClass="bg-brand-500 text-brand-500" 
            />
            <StatsCard 
              title="Critical Issues" 
              value={stats.by_level?.find(l => l.level === 'critical')?.count || 0} 
              icon={AlertTriangle} 
              colorClass="bg-red-500 text-red-500" 
            />
            <StatsCard 
              title="Duplicates Caught" 
              value={stats.duplicates_caught} 
              icon={DatabaseZap} 
              colorClass="bg-emerald-500 text-emerald-500" 
            />
            <StatsCard 
              title="Total Events (All Time)" 
              value={stats.total_errors} 
              icon={Clock} 
              colorClass="bg-purple-500 text-purple-500" 
            />
          </div>

          {/* Monitoring CTA Banner */}
          <Link to="/monitoring" className="block relative group overflow-hidden rounded-xl border border-brand-500/20 bg-dark-800/80 hover:border-brand-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-emerald-500/10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-500/10 to-transparent pointer-events-none"></div>
            
            <div className="relative p-6 sm:p-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex h-16 w-16 rounded-2xl bg-brand-500/20 items-center justify-center border border-brand-500/30 group-hover:scale-110 transition-transform">
                  <Server className="w-8 h-8 text-brand-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors">System Monitoring</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Now</span>
                  </div>
                  <p className="text-slate-400 max-w-xl text-sm leading-relaxed">View real-time resource utilization, CPU load, and detailed server infrastructure metrics in the dedicated monitoring dashboard.</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-slate-400 transition-colors">
                <div className="flex items-center gap-3 group-hover:text-white">
                  <div className="flex items-center gap-2 bg-dark-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium">CPU</span>
                  </div>
                  <div className="flex items-center gap-2 bg-dark-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                    <Database className="w-4 h-4 text-brand-400" />
                    <span className="text-sm font-medium">RAM</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold hover:from-brand-600 hover:to-brand-500 transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40">
                  View Monitoring
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Main Chart */}
          <div className="glass-panel p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Error Frequency (All Time)</h2>
            <ErrorsChart data={stats.timeline_24h} />
          </div>

          {/* Analytics Banner */}
          <AnalyticsBanner projectId={selectedProjectId} />

          {/* Incidents Table */}
          <IncidentsTable projectId={selectedProjectId} refreshKey={refreshKey} />
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
