import React from 'react';
import clsx from 'clsx';

const StatsCard = ({ title, value, icon: Icon, colorClass, trend }) => {
  return (
    <div className="glass-panel p-4 sm:p-6 relative overflow-hidden group">
      {/* Background glow effect on hover */}
      <div 
        className={clsx(
          "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity",
          colorClass
        )} 
      />
      
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-400 mb-1 truncate">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</h3>
          
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              <span className={clsx("font-medium", trend.isPositive ? "text-emerald-400" : "text-red-400")}>
                {trend.isPositive ? '+' : '-'}{trend.value}%
              </span>
              <span className="text-slate-500 ml-2">from last week</span>
            </div>
          )}
        </div>
        
        <div className={clsx("p-3 rounded-xl bg-opacity-10", colorClass)}>
          <Icon className={clsx("w-6 h-6", colorClass.replace('bg-', 'text-'))} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
