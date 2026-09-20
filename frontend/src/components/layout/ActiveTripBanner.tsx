import React from 'react';
import { Truck, ArrowRight } from 'lucide-react';
import { useBakery } from '../../context/BakeryContext';
import { getTripShopProgress } from '../../utils/tripProgress';

export interface ActiveTripBannerProps {
  onNavigateToTrip: (tripId: string) => void;
}

export const ActiveTripBanner: React.FC<ActiveTripBannerProps> = ({ onNavigateToTrip }) => {
  const { trips } = useBakery();
  const activeTrip = trips.find((t) => t.status === 'In Progress');

  if (!activeTrip) return null;

  const { completedShops, totalShops } = getTripShopProgress(activeTrip.shops);

  return (
    <div className="bg-[#172554] text-white px-4 py-2.5 shadow-sm border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-[#F59E0B] shrink-0">
            <Truck className="w-4 h-4" />
          </span>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-semibold text-amber-400">{activeTrip.vehiclePlate}</span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-300 hidden md:inline">
              {activeTrip.driverName} &amp; {activeTrip.staffName}
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-medium text-slate-200">
              <strong className="text-white">{completedShops}</strong> / {totalShops} shops completed
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTrip(activeTrip.id)}
          className="inline-flex items-center gap-1.5 bg-[#F59E0B] text-slate-950 px-3 py-1 rounded-md text-xs font-semibold hover:bg-amber-400 transition-colors shadow-xs ml-auto shrink-0"
        >
          <span>Continue Trip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
