import React, { useState, useEffect } from 'react';
import client from '../api/client';
import IncidentsTable from '../components/IncidentsTable';

const Incidents = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

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

  return (
    <div className="space-y-6">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">All Incidents</h1>
          <p className="text-slate-400 text-sm mt-1">View and filter all captured error logs</p>
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

      <IncidentsTable projectId={selectedProjectId} />
    </div>
  );
};

export default Incidents;
