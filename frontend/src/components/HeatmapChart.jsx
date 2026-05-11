import React from 'react';
import clsx from 'clsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getColor = (value, max) => {
  if (max === 0 || value === 0) return 'bg-slate-800/50';
  const intensity = value / max;
  if (intensity > 0.75) return 'bg-red-500/80';
  if (intensity > 0.5)  return 'bg-orange-500/70';
  if (intensity > 0.25) return 'bg-yellow-500/60';
  if (intensity > 0.1)  return 'bg-emerald-500/50';
  return 'bg-emerald-500/20';
};

const HeatmapChart = ({ matrix, maxCount }) => {
  if (!matrix || matrix.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hour labels */}
      <div className="flex">
        <div className="w-10 shrink-0" />
        <div className="flex-1 grid grid-cols-24 gap-0.5 text-[10px] text-slate-500">
          {HOURS.map(h => (
            <div key={h} className="text-center">
              {h % 3 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      {DAYS.map((day, dayIdx) => (
        <div key={day} className="flex items-center">
          <div className="w-10 shrink-0 text-xs text-slate-400 font-medium">{day}</div>
          <div className="flex-1 grid grid-cols-24 gap-0.5">
            {HOURS.map(hour => (
              <div
                key={hour}
                className={clsx(
                  'aspect-square rounded-sm transition-colors cursor-default',
                  getColor(matrix[dayIdx]?.[hour] || 0, maxCount)
                )}
                title={`${day} ${hour}:00 — ${matrix[dayIdx]?.[hour] || 0} errors`}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-2">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-800/50" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500/20" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500/50" />
        <div className="w-3 h-3 rounded-sm bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-sm bg-orange-500/70" />
        <div className="w-3 h-3 rounded-sm bg-red-500/80" />
        <span>More</span>
      </div>
    </div>
  );
};

export default HeatmapChart;
