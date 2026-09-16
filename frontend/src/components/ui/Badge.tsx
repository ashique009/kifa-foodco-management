import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'secondary';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-blue-50 text-[#172554] border border-blue-200 font-semibold',
    accent: 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    secondary: 'bg-slate-50 text-slate-600 border border-slate-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-slate-400',
    primary: 'bg-[#172554]',
    accent: 'bg-[#F59E0B]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    secondary: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

// Helper specialized badges for consistent domain concepts
export const TripStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'In Progress':
      return <Badge variant="accent" dot>In Progress</Badge>;
    case 'Completed':
      return <Badge variant="success" dot>Completed</Badge>;
    case 'Loaded':
      return <Badge variant="info" dot>Loaded</Badge>;
    case 'Draft':
      return <Badge variant="secondary" dot>Draft</Badge>;
    case 'Cancelled':
      return <Badge variant="danger" dot>Cancelled</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export const VehicleStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'Available':
      return <Badge variant="success" dot>Available</Badge>;
    case 'On Trip':
      return <Badge variant="accent" dot>On Trip</Badge>;
    case 'Maintenance':
      return <Badge variant="danger" dot>Maintenance</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const PaymentMethodBadge: React.FC<{ method: string }> = ({ method }) => {
  switch (method) {
    case 'Cash':
      return <Badge variant="success">Cash</Badge>;
    case 'UPI':
      return <Badge variant="info">UPI</Badge>;
    case 'Card':
      return <Badge variant="primary">Card</Badge>;
    case 'Bank Transfer':
      return <Badge variant="secondary">Bank Transfer</Badge>;
    case 'Due':
      return <Badge variant="danger">Due</Badge>;
    case 'Partial':
      return <Badge variant="warning">Partial Paid</Badge>;
    default:
      return <Badge variant="default">{method}</Badge>;
  }
};
