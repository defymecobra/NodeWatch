import React, { useState, useEffect } from 'react';
import client from '../api/client';
import StatsCard from '../components/StatsCard';
import ErrorsChart from '../components/ErrorsChart';
import IncidentsTable from '../components/IncidentsTable';
import { AlertTriangle, Activity, DatabaseZap, Clock } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await client.get('/dashboard/projects');
        if (res.data.success && res.data.projects.length > 0) {
          setProjects(res.data.projects);
          setSelectedProjectId(res.data.projects[0].id);
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
  }, [selectedProjectId]);

  return (
    <div className="space-y-6">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time error monitoring and analytics</p>
        </div>
        
        <div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-dark-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2.5 outline-none"
            disabled={projects.length === 0}
          >
            {projects.length === 0 ? (
              <option value="">No projects found</option>
            ) : (
              projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            )}
          </select>
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

          {/* Main Chart */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Error Frequency (Last 24 Hours)</h2>
            <ErrorsChart data={stats.timeline_24h} />
          </div>

          {/* Incidents Table */}
          <IncidentsTable projectId={selectedProjectId} />
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
