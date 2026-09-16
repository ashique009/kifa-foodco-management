import React from 'react';

export interface PaymentBreakdownProps {
  breakdown: {
    cash: number;
    upi: number;
    card: number;
    bankTransfer: number;
  };
}

export const PaymentBreakdownChart: React.FC<PaymentBreakdownProps> = ({ breakdown }) => {
  const total = breakdown.cash + breakdown.upi + breakdown.card + breakdown.bankTransfer || 1;

  const items = [
    { label: 'Cash', amount: breakdown.cash, color: '#16A34A', bgClass: 'bg-emerald-500' },
    { label: 'UPI', amount: breakdown.upi, color: '#2563EB', bgClass: 'bg-blue-600' },
    { label: 'Card', amount: breakdown.card, color: '#F59E0B', bgClass: 'bg-amber-500' },
    { label: 'Bank Transfer', amount: breakdown.bankTransfer, color: '#64748B', bgClass: 'bg-slate-500' },
  ];

  return (
    <div className="w-full flex flex-col justify-between h-full">
      {/* Segmented Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500 font-medium">Collection Modes</span>
          <span className="text-xs font-semibold text-slate-800">
            ₹{total.toLocaleString('en-IN')} Total
          </span>
        </div>

        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
          {items.map((item) => {
            const pct = (item.amount / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={item.label}
                style={{ width: `${pct}%`, backgroundColor: item.color }}
                title={`${item.label}: ₹${item.amount.toLocaleString('en-IN')} (${pct.toFixed(1)}%)`}
                className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
              />
            );
          })}
        </div>
      </div>

      {/* Breakdown Items List */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {items.map((item) => {
          const pct = Math.round((item.amount / total) * 100);
          return (
            <div key={item.label} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${item.bgClass}`} />
                <span className="text-xs font-medium text-slate-600">{item.label}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  ₹{item.amount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
