import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import HeatmapChart from '../components/HeatmapChart';
import HealthScore from '../components/HealthScore';
import { TrendingUp, Clock, BarChart3, Activity, DatabaseZap } from 'lucide-react';
import clsx from 'clsx';

const RANGES = [
  { value: '24h', label: '24h' },
  { value: '7d',  label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All Time' },
];

const LEVEL_COLORS = {
  critical: '#ef4444',
  error:    '#f97316',
  warn:     '#eab308',
  info:     '#3b82f6',
};

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6'];

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800 border border-slate-700 p-2 rounded-lg text-sm">
        <p className="text-white font-medium capitalize">{payload[0].name}</p>
        <p className="text-slate-300">{payload[0].value} errors</p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800 border border-slate-700 p-2 rounded-lg text-sm">
        <p className="text-white font-medium">{payload[0].payload.name}</p>
        <p className="text-brand-400">{payload[0].value} errors</p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [range, setRange] = useState('7d');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [projects, setProjects] = useState([]);
  const [overview, setOverview] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [topErrors, setTopErrors] = useState([]);
  const [health, setHealth] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await client.get('/dashboard/projects');
        if (res.data.success) setProjects(res.data.projects);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch analytics when range or project changes
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const pid = selectedProjectId || 'all';
        const [ovRes, hmRes, teRes, hlRes] = await Promise.all([
          client.get(`/analytics/overview?range=${range}&project_id=${pid}`),
          client.get(`/analytics/heatmap?range=${range}&project_id=${pid}`),
          client.get(`/analytics/top-errors?range=${range}&limit=10&project_id=${pid}`),
          client.get(`/analytics/health?project_id=${pid}`),
        ]);

        if (ovRes.data.success) setOverview(ovRes.data.overview);
        if (hmRes.data.success) setHeatmap(hmRes.data.heatmap);
        if (teRes.data.success) setTopErrors(teRes.data.top_errors);
        if (hlRes.data.success) setHealth(hlRes.data.health);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [range, selectedProjectId]);

  // Prepare pie chart data
  const pieData = (overview?.by_level || []).map(item => ({
    name: item.level,
    value: parseInt(item.count),
  }));

  // Prepare bar chart data
  const barData = (overview?.by_project || []).map(item => ({
    name: item.name,
    errors: parseInt(item.error_count),
  }));

  // Find max occurrences for top-errors progress bars
  const maxOccurrence = topErrors.length > 0
    ? Math.max(...topErrors.map(e => parseInt(e.total_occurrences)))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1.5">Cross-project insights and error patterns</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Project Selector */}
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
          {/* Range Selector */}
          <div className="flex gap-2">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  range === r.value
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : 'text-slate-400 border-slate-700 hover:bg-slate-800'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/10">
                <Activity className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Errors</p>
                <p className="text-2xl font-bold text-white">{overview?.totals?.total_errors || 0}</p>
              </div>
            </div>
            <div className="glass-panel p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-brand-500/10">
                <BarChart3 className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Active Projects</p>
                <p className="text-2xl font-bold text-white">{overview?.totals?.active_projects || 0}</p>
              </div>
            </div>
            <div className="glass-panel p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Duplicates Caught</p>
                <p className="text-2xl font-bold text-white">{overview?.totals?.duplicates_caught || 0}</p>
              </div>
            </div>
          </div>

          {/* Charts Row: Pie + Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Distribution Pie */}
            <div className="glass-panel p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Error Distribution by Level</h2>
              {pieData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, idx) => (
                          <Cell
                            key={entry.name}
                            fill={LEVEL_COLORS[entry.name] || PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {pieData.map(entry => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: LEVEL_COLORS[entry.name] }}
                        />
                        <span className="text-xs text-slate-400 capitalize">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-60 flex items-center justify-center text-slate-500">No data</div>
              )}
            </div>

            {/* Errors by Project Bar Chart */}
            <div className="glass-panel p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Errors by Project</h2>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
                    <Bar dataKey="errors" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-slate-500">No data</div>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="glass-panel p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Error Heatmap (Day × Hour)</h2>
            <HeatmapChart matrix={heatmap?.matrix} maxCount={heatmap?.maxCount || 0} />
          </div>

          {/* Health Scores */}
          {health.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Project Health Scores</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {health.map(project => (
                  <HealthScore
                    key={project.id}
                    score={project.score}
                    name={project.name}
                    details={project}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top Recurring Errors */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white">Top Recurring Errors</h2>
            </div>
            {topErrors.length > 0 ? (
              <div className="divide-y divide-slate-700/50">
                {topErrors.map((err, idx) => (
                  <div key={idx} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate">{err.message}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className={clsx(
                            'uppercase font-medium mr-2',
                            err.level === 'critical' ? 'text-red-400' :
                            err.level === 'error' ? 'text-orange-400' :
                            err.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'
                          )}>
                            {err.level}
                          </span>
                          {err.project_name}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-white whitespace-nowrap">
                        {parseInt(err.total_occurrences).toLocaleString()}×
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${(parseInt(err.total_occurrences) / maxOccurrence) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">No errors in this period</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
