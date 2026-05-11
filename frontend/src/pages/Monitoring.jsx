import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Database, HardDrive, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import client from '../api/client';
import clsx from 'clsx';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.dataKey} className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
            <span className="text-white">{p.name}:</span>
            <span style={{ color: p.color }}>
              {p.name.includes('RAM') || p.name.includes('RSS') ? formatBytes(p.value) : `${p.value}%`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const MetricCard = ({ title, value, subtitle, icon: Icon, colorClass, highlight = false }) => (
  <div className={clsx(
    "p-6 rounded-xl border flex items-center gap-4 transition-all duration-300",
    highlight 
      ? "bg-brand-500/10 border-brand-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
      : "bg-dark-800/50 border-white/5"
  )}>
    <div className={clsx("p-4 rounded-lg", highlight ? "bg-brand-500/20" : "bg-dark-700")}>
      <Icon className={clsx("w-6 h-6", colorClass)} />
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className={clsx("text-2xl font-bold", highlight ? "text-brand-400" : "text-white")}>{value}</h3>
        {subtitle && <span className="text-slate-500 text-xs">{subtitle}</span>}
      </div>
    </div>
  </div>
);

const Monitoring = () => {
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await client.get('/system/metrics');
        if (res.data.success) {
          const metrics = res.data.metrics;
          setCurrent(metrics);
          
          setData(prev => {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newPoint = {
              time: now,
              cpu: metrics.server.cpu_usage_percent,
              ramServer: metrics.server.used_mem,
              ramApp: metrics.process.rss
            };
            const newData = [...prev, newPoint];
            if (newData.length > 30) newData.shift(); // Keep last 30 points
            return newData;
          });
        }
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Monitoring</h1>
          <p className="text-slate-400 text-sm mt-1.5">Live performance metrics and resource utilization</p>
        </div>
        <div className="flex items-center gap-2 text-brand-400 bg-brand-500/10 px-4 py-2 rounded-full border border-brand-500/20">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Live</span>
        </div>
      </div>

      {!current ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="CPU Usage"
              value={`${current.server.cpu_usage_percent}%`}
              subtitle={`Load Avg: ${current.server.load_avg[0].toFixed(2)}`}
              icon={Cpu}
              colorClass="text-emerald-400"
            />
            <MetricCard
              title="App Memory (RSS)"
              value={formatBytes(current.process.rss)}
              subtitle="Extremely Lightweight!"
              icon={Activity}
              colorClass="text-brand-400"
              highlight={true}
            />
            <MetricCard
              title="Server RAM Used"
              value={formatBytes(current.server.used_mem)}
              subtitle={`Total: ${formatBytes(current.server.total_mem)}`}
              icon={Database}
              colorClass="text-amber-400"
            />
            <MetricCard
              title="App Uptime"
              value={formatUptime(current.process.uptime)}
              subtitle={`Server: ${formatUptime(current.server.uptime)}`}
              icon={Clock}
              colorClass="text-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Chart */}
            <div className="bg-dark-800 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-slate-400" />
                CPU Utilization
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10} minTickGap={30} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="cpu" name="CPU Usage" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RAM Chart */}
            <div className="bg-dark-800 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <Database className="w-5 h-5 mr-2 text-slate-400" />
                Memory Consumption
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorRamApp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10} minTickGap={30} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => formatBytes(val)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="ramApp" name="App RAM (RSS)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRamApp)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Infrastructure Info */}
          {current.system_info && (
            <div className="bg-dark-800/50 border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <Server className="w-5 h-5 mr-2 text-slate-400" />
                Infrastructure & Environment
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Operating System</p>
                  <p className="text-slate-200 font-medium">{current.system_info.os_platform}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Node.js Version</p>
                  <p className="text-slate-200 font-medium">{current.system_info.node_version}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Database Storage Used</p>
                  <p className="text-emerald-400 font-medium">{current.system_info.db_size}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Logs Processed</p>
                  <p className="text-brand-400 font-medium">{current.system_info.total_logs.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Monitoring;
