import React, { useState, useEffect } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  FolderPlus, Trash2, Key, Plus, Bell, Users as UsersIcon,
  Database, Copy, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Tab Button Component ────────────────────────────────────────────────────
const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={clsx(
      'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
      active
        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    )}
  >
    <Icon className="w-4 h-4 mr-2" />
    {label}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════
const ProjectsTab = () => {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [projectKeys, setProjectKeys] = useState({}); // { projectId: [keys] }
  const [expandedProject, setExpandedProject] = useState(null);

  const fetchProjects = async () => {
    try {
      const res = await client.get('/dashboard/projects');
      if (res.data.success) setProjects(res.data.projects);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await client.post('/admin/projects', { name: newName.trim() });
      if (res.data.success) {
        toast.success(`Project "${res.data.project.name}" created!`);
        setNewName('');
        fetchProjects();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}" and ALL its data?`)) return;
    try {
      await client.delete(`/admin/projects/${id}`);
      toast.success(`Project "${name}" deleted`);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleGenerateKey = async (projectId) => {
    try {
      const res = await client.post(`/admin/projects/${projectId}/keys`, { label: 'Generated Key' });
      if (res.data.success) {
        const rawKey = res.data.key.raw_key;
        await navigator.clipboard.writeText(rawKey);
        toast.success('API Key generated and copied to clipboard!', { duration: 5000 });
        // Refresh keys for this project
        fetchKeysForProject(projectId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate key');
    }
  };

  const fetchKeysForProject = async (projectId) => {
    try {
      const res = await client.get(`/admin/projects/${projectId}/keys`);
      if (res.data.success) {
        setProjectKeys(prev => ({ ...prev, [projectId]: res.data.keys }));
      }
    } catch (err) { console.error(err); }
  };

  const handleDeactivateKey = async (keyId, projectId) => {
    try {
      await client.delete(`/admin/keys/${keyId}`);
      toast.success('API Key deactivated');
      fetchKeysForProject(projectId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate key');
    }
  };

  const toggleExpand = (projectId) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      if (!projectKeys[projectId]) {
        fetchKeysForProject(projectId);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div></div>;

  return (
    <div className="space-y-6">
      {/* Create New Project */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="New project name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1 px-4 py-2.5 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 outline-none focus:border-brand-500"
        />
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <FolderPlus className="w-4 h-4" /> Create
        </button>
      </div>

      {/* Project List */}
      <div className="space-y-3">
        {projects.map(p => (
          <div key={p.id} className="glass-panel overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white font-medium">{p.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{p.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 mr-2">{p.total_errors || 0} errors</span>
                <button
                  onClick={() => toggleExpand(p.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                  title="Manage API Keys"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded: API Keys */}
            {expandedProject === p.id && (
              <div className="border-t border-slate-700/50 p-4 bg-dark-900/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-300">API Keys</h4>
                  <button
                    onClick={() => handleGenerateKey(p.id)}
                    className="inline-flex items-center text-xs px-3 py-1.5 bg-brand-500/10 text-brand-400 rounded-lg hover:bg-brand-500/20 transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Generate Key
                  </button>
                </div>
                {projectKeys[p.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {projectKeys[p.id].map(k => (
                      <div key={k.id} className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50 text-xs">
                        <div>
                          <span className="text-slate-300 font-medium">{k.label}</span>
                          <span className={clsx("ml-2 px-1.5 py-0.5 rounded", k.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                            {k.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {k.is_active && (
                          <button
                            onClick={() => handleDeactivateKey(k.id, p.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No keys yet. Generate one to start collecting logs.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: ALERTS
// ═══════════════════════════════════════════════════════════════════════════════
const AlertsTab = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [chatId, setChatId] = useState('');
  const [minLevel, setMinLevel] = useState('error');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await client.get('/dashboard/projects');
        if (res.data.success && res.data.projects.length > 0) {
          setProjects(res.data.projects);
          setSelectedProjectId(res.data.projects[0].id);
        }
      } catch (err) { console.error(err); }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const fetchAlerts = async () => {
      setIsLoading(true);
      try {
        const res = await client.get(`/admin/projects/${selectedProjectId}/alerts`);
        if (res.data.success) setAlerts(res.data.alerts);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchAlerts();
  }, [selectedProjectId]);

  const handleAddAlert = async () => {
    if (!chatId.trim()) { toast.error('Chat ID is required'); return; }
    try {
      const res = await client.post(`/admin/projects/${selectedProjectId}/alerts`, {
        channel: 'telegram',
        recipient_id: chatId.trim(),
        min_level: minLevel,
      });
      if (res.data.success) {
        toast.success('Alert config added!');
        setChatId('');
        setAlerts(prev => [res.data.alert, ...prev]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await client.delete(`/admin/alerts/${alertId}`);
      toast.success('Alert config deleted');
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <select
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
        className="bg-dark-800 border border-slate-700 text-slate-200 text-sm rounded-lg block w-full p-2.5 outline-none"
      >
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* Add Alert Form */}
      <div className="glass-panel p-4 space-y-4">
        <h3 className="text-sm font-medium text-white">Add Telegram Alert</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Telegram Chat ID"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 outline-none"
          />
          <select
            value={minLevel}
            onChange={(e) => setMinLevel(e.target.value)}
            className="px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm outline-none"
          >
            <option value="info">Info+</option>
            <option value="warn">Warn+</option>
            <option value="error">Error+</option>
            <option value="critical">Critical only</option>
          </select>
          <button onClick={handleAddAlert} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Alert Configs List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div></div>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No alert configs for this project.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="glass-panel p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-400" />
                  <span className="text-sm text-white font-medium capitalize">{a.channel}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">≥ {a.min_level}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">Chat ID: {a.recipient_id}</p>
              </div>
              <button
                onClick={() => handleDeleteAlert(a.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: USERS
// ═══════════════════════════════════════════════════════════════════════════════
const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('developer');

  const fetchUsers = async () => {
    try {
      const res = await client.get('/admin/users');
      if (res.data.success) setUsers(res.data.users);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newPassword) {
      toast.error('Email and password are required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid email address (e.g. user@example.com)');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await client.post('/auth/register', {
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      if (res.data.success) {
        toast.success(`User "${res.data.user.email}" created as ${res.data.user.role}`);
        setNewEmail('');
        setNewPassword('');
        setNewRole('developer');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await client.patch(`/admin/users/${userId}`, { role: newRole });
      if (res.data.success) {
        toast.success(`Role updated to ${newRole}`);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    try {
      await client.delete(`/admin/users/${userId}`);
      toast.success(`User "${email}" deleted`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div></div>;

  return (
    <div className="space-y-6">
      {/* Create New User Form */}
      <div className="glass-panel p-4 space-y-4">
        <h3 className="text-sm font-medium text-white">Create New User</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 outline-none"
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 outline-none"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm outline-none"
          >
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="guest">Guest</option>
          </select>
          <button onClick={handleCreateUser} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase bg-dark-900/50 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-700/50">
                <td className="px-6 py-4 text-slate-200 font-medium">
                  {u.email}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400">You</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === currentUser?.id}
                    className="bg-dark-800 border border-slate-700 text-slate-200 text-xs rounded-lg p-1.5 outline-none disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="developer">Developer</option>
                    <option value="guest">Guest</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: DATA RETENTION
// ═══════════════════════════════════════════════════════════════════════════════
const RetentionTab = () => {
  const [days, setDays] = useState(30);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePurge = async () => {
    if (!window.confirm(`Delete ALL logs older than ${days} days? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await client.delete('/admin/logs/cleanup', { data: { days } });
      if (res.data.success) {
        toast.success(res.data.message, { duration: 5000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to purge logs');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="glass-panel p-6 max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Purge Old Logs</h3>
        <p className="text-sm text-slate-400">
          Permanently delete error logs older than the specified number of days to free up database storage.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-300">Delete logs older than</label>
        <input
          type="number"
          min="1"
          max="365"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value) || 30)}
          className="w-20 px-3 py-2 bg-dark-800 border border-slate-700 rounded-lg text-white text-sm outline-none text-center"
        />
        <span className="text-sm text-slate-300">days</span>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-xs text-red-300">This action is irreversible. Deleted logs cannot be recovered.</p>
      </div>

      <button
        onClick={handlePurge}
        disabled={isDeleting}
        className="px-6 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 text-sm font-medium"
      >
        {isDeleting ? 'Deleting...' : `Purge Logs Older Than ${days} Days`}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('projects');

  const allTabs = [
    { key: 'projects', label: 'Projects', icon: FolderPlus, roles: ['admin', 'developer'] },
    { key: 'alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'developer'] },
    { key: 'users', label: 'Users', icon: UsersIcon, roles: ['admin'] },
    { key: 'retention', label: 'Data Retention', icon: Database, roles: ['admin'] },
  ];

  const tabs = allTabs.filter(t => t.roles.includes(user?.role));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage projects, API keys, alerts, users, and data retention.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'retention' && <RetentionTab />}
      </div>
    </div>
  );
};

export default Settings;
