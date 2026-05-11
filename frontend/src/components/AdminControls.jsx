import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Zap, Database, Play, Square, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const AdminControls = ({ projectId, onEventSent }) => {
  const { user } = useAuth();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Only render for admins
  if (!user || user.role !== 'admin') return null;

  // Poll simulation and seeding status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await client.get('/system/metrics');
        if (res.data.success) {
          setIsSimulating(res.data.metrics.simulation.is_running);
          setIsSeeding(res.data.metrics.simulation.is_seeding);
        }
      } catch (err) {
        console.error('Failed to fetch system status', err);
      } finally {
        setIsStatusLoading(false);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSendTest = async () => {
    if (!projectId || projectId === 'all') {
      toast.error('Select a specific project to send a test event');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await client.post('/logs/test', { project_id: projectId });
      if (res.data.success) {
        toast.success('Test event sent successfully');
        if (onEventSent) onEventSent();
      }
    } catch (err) {
      toast.error('Failed to send test event');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSeedHistory = async () => {
    if (isSeeding) return;
    
    setIsSeeding(true);
    try {
      const res = await client.post('/system/seed-history');
      if (res.data.success) {
        toast.success('History seeding started in background');
      }
    } catch (err) {
      toast.error('Failed to start seeding');
      setIsSeeding(false);
    }
  };

  const toggleSimulation = async () => {
    const endpoint = isSimulating ? '/system/simulators/stop' : '/system/simulators/start';
    const action = isSimulating ? 'Stopping' : 'Starting';

    try {
      const res = await client.post(endpoint);
      if (res.data.success) {
        setIsSimulating(!isSimulating);
        toast.success(`${isSimulating ? 'Simulators stopped' : 'Simulators started'}`);
      }
    } catch (err) {
      toast.error(`Failed to ${action.toLowerCase()} simulators`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Seed History Button */}
      <button
        onClick={handleSeedHistory}
        disabled={isSeeding}
        className="inline-flex items-center px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all disabled:opacity-50 text-xs font-bold uppercase tracking-wider"
        title="Populate DB with 30 days of historical data"
      >
        {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
        {isSeeding ? 'Seeding...' : 'Seed History'}
      </button>

      {/* Simulation Toggle */}
      <button
        onClick={toggleSimulation}
        disabled={isStatusLoading}
        className={clsx(
          "inline-flex items-center px-4 py-2 border rounded-xl transition-all text-xs font-bold uppercase tracking-wider",
          isSimulating 
            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
            : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
        )}
      >
        {isSimulating ? <Square className="w-4 h-4 mr-2 fill-current" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
        {isSimulating ? 'Stop Simulation' : 'Run Simulation'}
      </button>

      {/* Test Event Button */}
      <button
        onClick={handleSendTest}
        disabled={isSendingTest}
        className="inline-flex items-center px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50 text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/5"
      >
        {isSendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
        Send Test
      </button>
    </div>
  );
};

export default AdminControls;
