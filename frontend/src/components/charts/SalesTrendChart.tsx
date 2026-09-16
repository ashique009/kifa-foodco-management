import React, { useState } from 'react';

interface DayData {
  day: string;
  date: string;
  sales: number;
}

const mockTrendData: DayData[] = [
  { day: 'Tue', date: '08 Sep', sales: 9400 },
  { day: 'Wed', date: '09 Sep', sales: 11200 },
  { day: 'Thu', date: '10 Sep', sales: 10800 },
  { day: 'Fri', date: '11 Sep', sales: 13500 },
  { day: 'Sat', date: '12 Sep', sales: 15200 },
  { day: 'Sun', date: '13 Sep', sales: 14100 },
  { day: 'Today', date: '14 Sep', sales: 12450 },
];

export const SalesTrendChart: React.FC<{ todaySales?: number }> = ({ todaySales }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = mockTrendData.map((d, i) =>
    i === mockTrendData.length - 1 && todaySales !== undefined ? { ...d, sales: todaySales } : d
  );

  const maxSales = Math.max(...data.map((d) => d.sales), 16000);
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 35;
  const paddingY = 20;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.sales / maxSales) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Fill area under line
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${
    chartHeight - paddingY
  } Z`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#172554]" />
          <span className="text-xs text-slate-500 font-medium">Daily Sales Revenue</span>
        </div>
        <span className="text-xs font-semibold text-slate-700">7-Day Trend</span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
        >
          <defs>
            <linearGradient id="salesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#172554" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#172554" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = chartHeight - paddingY - fraction * (chartHeight - paddingY * 2);
            return (
              <g key={fraction}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-medium"
                >
                  ₹{(Math.round((maxSales * fraction) / 1000))}k
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#salesGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#172554"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            const isToday = idx === points.length - 1;
            return (
              <g key={idx}>
                {/* Invisible hover target */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                {/* Visible node */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : isToday ? 4.5 : 3.5}
                  fill={isToday ? '#F59E0B' : '#172554'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150 pointer-events-none"
                />
                {/* Day label */}
                <text
                  x={pt.x}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={`text-[10px] ${
                    isToday ? 'fill-[#172554] font-bold' : 'fill-slate-500 font-medium'
                  }`}
                >
                  {pt.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIdx !== null && (
          <div
            className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-md pointer-events-none transition-all duration-150"
            style={{
              left: `${(points[hoveredIdx].x / chartWidth) * 100}%`,
              top: `${Math.max(10, points[hoveredIdx].y - 35)}px`,
            }}
          >
            <div className="font-semibold">₹{points[hoveredIdx].sales.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-300">{points[hoveredIdx].date}</div>
          </div>
        )}
      </div>
    </div>
  );
};
