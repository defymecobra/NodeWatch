import React from 'react';
import clsx from 'clsx';

const HealthScore = ({ score, name, details }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-400', label: 'Healthy' };
    if (s >= 60) return { stroke: '#eab308', text: 'text-yellow-400', label: 'Warning' };
    if (s >= 30) return { stroke: '#f97316', text: 'text-orange-400', label: 'Degraded' };
    return { stroke: '#ef4444', text: 'text-red-400', label: 'Critical' };
  };

  const color = getColor(score);

  return (
    <div className="glass-panel p-4 flex flex-col items-center text-center space-y-3">
      {/* SVG Circular Progress */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('text-2xl font-bold', color.text)}>{score}</span>
        </div>
      </div>

      {/* Project name */}
      <div>
        <p className="text-sm font-semibold text-white truncate max-w-[140px]">{name}</p>
        <p className={clsx('text-xs font-medium', color.text)}>{color.label}</p>
      </div>

      {/* Error breakdown */}
      {details && (
        <div className="flex gap-3 text-[10px] text-slate-400">
          {details.critical_count > 0 && (
            <span className="text-red-400">{details.critical_count} crit</span>
          )}
          {details.error_count > 0 && (
            <span className="text-orange-400">{details.error_count} err</span>
          )}
          {details.warn_count > 0 && (
            <span className="text-yellow-400">{details.warn_count} warn</span>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthScore;
