import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your projects, API keys, and notification alerts.</p>
      </div>

      <div className="glass-panel p-8 text-center border-dashed">
        <SettingsIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-slate-300 mb-2">Settings Module</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          The settings area is currently under construction. Here you will be able to generate new API keys, configure Telegram alerts, and invite team members.
        </p>
        <button className="btn-primary mt-6 opacity-50 cursor-not-allowed">
          Coming Soon
        </button>
      </div>
    </div>
  );
};

export default Settings;
