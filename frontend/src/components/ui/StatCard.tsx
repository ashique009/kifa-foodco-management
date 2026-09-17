import React from 'react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  accentColor?: 'primary' | 'orange' | 'green' | 'blue';
  onClick?: () => void;
  isProminent?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  accentColor = 'primary',
  onClick,
  isProminent = false,
  className = '',
}) => {
  const iconBgStyles = {
    primary: 'bg-blue-50 text-[#172554]',
    orange: 'bg-amber-50 text-amber-600',
    green: isProminent ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600',
    blue: 'bg-sky-50 text-sky-600',
  };

  const prominentCardStyles = isProminent
    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 via-white to-white ring-2 ring-emerald-500/20 shadow-md'
    : '';

  return (
    <Card
      hoverEffect={!!onClick}
      onClick={onClick}
      className={`p-3.5 sm:p-5 relative overflow-hidden ${prominentCardStyles} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {isProminent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-xs font-semibold uppercase tracking-wider ${isProminent ? 'text-emerald-900' : 'text-slate-500'}`}>
              {title}
            </p>
            {isProminent && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                Primary
              </span>
            )}
          </div>
          <div className={`mt-1.5 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight truncate ${isProminent ? 'text-emerald-700' : 'text-slate-900'}`}>
            {value}
          </div>
        </div>
        <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${iconBgStyles[accentColor]}`}>
          {icon}
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && (
            <span className={isProminent ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`font-semibold inline-flex items-center gap-1 ${
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
              {trend.label && <span className="text-slate-400 font-normal ml-0.5">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
