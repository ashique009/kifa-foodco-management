import React from 'react';

export interface ProgressBarProps {
  value: number; // current value
  max?: number; // maximum value (default 100)
  label?: string;
  showPercent?: boolean;
  color?: 'primary' | 'orange' | 'green' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercent = true,
  color = 'primary',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const colorStyles = {
    primary: 'bg-[#172554]',
    orange: 'bg-[#F59E0B]',
    green: 'bg-emerald-600',
    red: 'bg-rose-600',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-medium text-slate-700">
          {label && <span>{label}</span>}
          {showPercent && <span className="text-slate-500">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${sizeStyles[size]} ${colorStyles[color]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
