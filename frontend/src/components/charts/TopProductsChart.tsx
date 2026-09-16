import React from 'react';

export interface TopProductItem {
  id: string;
  name: string;
  unit: string;
  quantitySold: number;
  revenue: number;
}

const mockTopProducts: TopProductItem[] = [
  { id: '1', name: 'Milk Bread (400g)', unit: 'pkts', quantitySold: 145, revenue: 4350 },
  { id: '2', name: 'Sweet Bun (Pack of 4)', unit: 'pkts', quantitySold: 75, revenue: 1125 },
  { id: '3', name: 'Vanilla Cream Bun', unit: 'pcs', quantitySold: 50, revenue: 1000 },
  { id: '4', name: 'Whole Wheat Brown Bread', unit: 'pkts', quantitySold: 45, revenue: 1800 },
  { id: '5', name: 'Rich Plum Cake (500g)', unit: 'boxes', quantitySold: 14, revenue: 3500 },
];

export const TopProductsChart: React.FC<{ items?: TopProductItem[] }> = ({
  items = mockTopProducts,
}) => {
  const maxQty = Math.max(...items.map((i) => i.quantitySold), 1);

  return (
    <div className="space-y-3.5">
      {items.map((prod, idx) => {
        const pct = Math.round((prod.quantitySold / maxQty) * 100);
        return (
          <div key={prod.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <span className="font-medium text-slate-800">{prod.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-normal">
                  {prod.quantitySold} {prod.unit}
                </span>
                <span className="font-semibold text-slate-900 w-16 text-right">
                  ₹{prod.revenue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden ml-7 max-w-[calc(100%-28px)]">
              <div
                className="bg-[#172554] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
