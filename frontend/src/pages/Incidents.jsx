import React, { useState, useEffect } from 'react';
import client from '../api/client';
import IncidentsTable from '../components/IncidentsTable';
import { Search, DatabaseZap } from 'lucide-react';
import clsx from 'clsx';

const LEVELS = ['all', 'critical', 'error', 'warn', 'info'];

const Incidents = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  return (
    <div className="space-y-6">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">All Incidents</h1>
          <p className="text-slate-400 text-sm mt-1.5">View, filter, and sort all captured error logs</p>
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
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Level Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium uppercase tracking-wider rounded-lg border transition-colors',
                selectedLevel === lvl
                  ? lvl === 'all'      ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                  : lvl === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : lvl === 'error'    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  : lvl === 'warn'     ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  :                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700 hover:bg-slate-800'
              )}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>
      </div>

      <IncidentsTable
        projectId={selectedProjectId}
        level={selectedLevel === 'all' ? '' : selectedLevel}
        search={debouncedSearch}
      />
    </div>
  );
};

export default Incidents;
