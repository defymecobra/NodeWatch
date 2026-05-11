import React, { useState, useEffect, useRef } from 'react';
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

const GaugeCard = ({ title, value, max = 100, unit = '%', icon: Icon, subtitle, color }) => {
  const radius = 45;
  const stroke = 8;
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on value percentage
  const getStatusColor = (p) => {
    if (p < 60) return '#10b981'; // emerald-500
    if (p < 85) return '#f59e0b'; // amber-500
    return '#f43f5e'; // rose-500
  };

  const currentColor = color || getStatusColor(percentage);

  return (
    <div className="bg-dark-800/50 border border-white/5 rounded-xl p-6 flex flex-col items-center text-center group hover:border-brand-500/30 transition-all duration-500">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="absolute w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />
          {/* Progress Circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke={currentColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset,
              transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease'
            }}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center Content */}
        <div className="z-10 flex flex-col items-center">
          <Icon className="w-5 h-5 mb-1 text-slate-500 group-hover:text-slate-300 transition-colors" />
          <span className="text-2xl font-bold text-white tracking-tight">
            {Math.round(normalizedValue)}
            <span className="text-sm font-medium text-slate-500 ml-0.5">{unit}</span>
          </span>
        </div>

        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-2xl opacity-20 transition-opacity duration-1000"
          style={{ backgroundColor: currentColor }}
        ></div>
      </div>

      <div className="mt-4">
        <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h4>
        {subtitle && <p className="text-slate-500 text-[10px] mt-1 font-mono">{subtitle}</p>}
      </div>
    </div>
  );
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
              ramApp: metrics.process.rss,
            };

            const newData = [...prev, newPoint];
            if (newData.length > 30) newData.shift(); 
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
            <GaugeCard
              title="CPU Load"
              value={current.server.cpu_usage_percent}
              subtitle={`Load Avg: ${current.server.load_avg[0].toFixed(2)}`}
              icon={Cpu}
            />
            <GaugeCard
              title="Server RAM"
              value={(current.server.used_mem / current.server.total_mem) * 100}
              unit="%"
              subtitle={`${formatBytes(current.server.used_mem)} / ${formatBytes(current.server.total_mem)}`}
              icon={Database}
            />
            <MetricCard
              title="Process RSS"
              value={formatBytes(current.process.rss)}
              subtitle="Current Node process"
              icon={Activity}
              colorClass="text-brand-400"
              highlight={true}
            />
            <MetricCard
              title="Up Time"
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

          {/* High-Density Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Node.js Heap Widget */}
            <div className="bg-dark-800/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Heap</span>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400">Used</span>
                  <span className="text-sm font-mono text-white">{formatBytes(current.process.heap_used)}</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-1000" 
                    style={{ width: `${(current.process.heap_used / current.process.heap_total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Total: {formatBytes(current.process.heap_total)}</span>
                  <span>{Math.round((current.process.heap_used / current.process.heap_total) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Database Widget */}
            <div className="bg-dark-800/40 border border-white/5 rounded-xl p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Database Health</span>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white leading-none">{current.system_info.db_size}</div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase">Storage Used</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">Total Records</span>
                <span className="text-xs font-mono text-emerald-400">{current.system_info.total_logs.toLocaleString()}</span>
              </div>
            </div>

            {/* Platform Widget */}
            <div className="bg-dark-800/40 border border-white/5 rounded-xl p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Environment</span>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-300 truncate">{current.system_info.os_platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-300">Node {current.system_info.node_version}</span>
                </div>
              </div>
            </div>

            {/* Live Status Widget */}
            <div className="bg-dark-800/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">System Status</span>
              <div className="py-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm font-bold uppercase tracking-tight">Healthy</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">All services responding normally</p>
              </div>
              <div className="text-[10px] text-slate-600 font-mono">
                Last update: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Monitoring;
