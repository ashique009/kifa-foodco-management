import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TripStatusBadge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Tabs } from '../components/ui/Tabs';
import { getTripShopProgress } from '../utils/tripProgress';
import { Plus, Truck, Calendar, Store, ArrowRight, User } from 'lucide-react';
import { Trip } from '../types';

interface TripsPageProps {
  onSelectTrip: (tripId: string) => void;
  onOpenNewTrip: () => void;
}

export const TripsPage: React.FC<TripsPageProps> = ({ onSelectTrip, onOpenNewTrip }) => {
  const { trips, canManage } = useBakery();
  const [activeTab, setActiveTab] = useState<string>('trips');

  const filterTabs = [
    {
      id: 'trips',
      label: 'Trips',
      count: trips.filter((t) => t.status !== 'Completed').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: trips.filter((t) => t.status === 'Completed').length,
    },
  ];

  const filteredTrips = trips.filter((t) => {
    if (activeTab === 'completed') return t.status === 'Completed';
    return t.status !== 'Completed';
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Trips</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage delivery routes, van stock loading and daily shop dispatches
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onOpenNewTrip}
          >
            + New Trip
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Trip Cards / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrips.map((trip) => {
          const { completedShops, totalShops } = getTripShopProgress(trip.shops);

          return (
            <Card
              key={trip.id}
              hoverEffect
              className="p-5 flex flex-col justify-between cursor-pointer border border-slate-200 transition-all"
              onClick={() => onSelectTrip(trip.id)}
            >
              <div>
                {/* Header: Vehicle Plate & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-base text-slate-900 tracking-tight">
                        {trip.vehiclePlate}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                      {trip.tripNumber}
                    </span>
                  </div>
                  <TripStatusBadge status={trip.status} />
                </div>

                {/* Driver & Staff info */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      <strong className="text-slate-800 font-medium">{trip.driverName}</strong> (Driver) •{' '}
                      <strong className="text-slate-800 font-medium">{trip.staffName}</strong> (Sales)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {trip.startDate && trip.endDate
                        ? `${trip.startDate} → ${trip.endDate}`
                        : `Date: ${trip.date}`}
                    </span>
                    {trip.startedAt && <span>• Departs {trip.startedAt}</span>}
                  </div>
                </div>

                {/* Shop Progress */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      Shop Progress
                    </span>
                    <span className="font-bold text-slate-800">
                      {completedShops} / {totalShops} shops
                    </span>
                  </div>
                  <ProgressBar
                    value={completedShops}
                    max={totalShops || 1}
                    color={trip.status === 'Completed' ? 'green' : 'primary'}
                    size="sm"
                    showPercent={false}
                  />
                </div>
              </div>

              {/* Action button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {trip.loadedItems.length} Products Loaded
                </span>
                <Button
                  size="sm"
                  variant={trip.status === 'In Progress' ? 'accent' : 'secondary'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrip(trip.id);
                  }}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  {trip.status === 'In Progress'
                    ? 'Continue Trip'
                    : trip.status === 'Completed'
                    ? 'View Summary'
                    : 'Start Trip'}
                </Button>
              </div>
            </Card>
          );
        })}

        {filteredTrips.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No trips found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no trips matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
