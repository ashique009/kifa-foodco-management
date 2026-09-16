import React from 'react';
import { Trip, Sale, Payment } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TripStatusBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Truck, Calendar, Store, ArrowRight, UserCheck } from 'lucide-react';

interface TripCardProps {
  trip: Trip;
  sales: Sale[];
  payments: Payment[];
  onSelectTrip: (tripId: string) => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  sales,
  payments,
  onSelectTrip,
}) => {
  // Format trip date range or duration (e.g. Sep 15 → Sep 21)
  const formatMonthDay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getTripDuration = () => {
    if (trip.startDate && trip.endDate) {
      return `${formatMonthDay(trip.startDate)} → ${formatMonthDay(trip.endDate)}`;
    }
    if (trip.startDate) {
      return `${formatMonthDay(trip.startDate)} → Ongoing`;
    }
    if (trip.date) {
      return formatMonthDay(trip.date);
    }
    return '';
  };

  // 1. Trip Collection (Total payments received during THIS specific trip)
  const tripPayments = payments.filter((p) => p.tripId === trip.id);
  const tripPaymentsSum = tripPayments.reduce((sum, p) => sum + p.amount, 0);
  const tripShopsCollectionSum = trip.shops.reduce(
    (sum, s) => sum + (s.paymentReceived || 0),
    0
  );
  const tripCollection = Math.max(tripPaymentsSum, tripShopsCollectionSum);

  // 2. Trip Sales (Total sales recorded during THIS specific trip)
  const tripSalesList = sales.filter((s) => s.tripId === trip.id);
  const tripSalesSum = tripSalesList.reduce((sum, s) => sum + s.total, 0);
  const tripShopsSalesSum = trip.shops.reduce((sum, s) => {
    const matchedSale = sales.find((sl) => sl.id === s.saleId);
    return sum + (matchedSale?.total || 0);
  }, 0);
  const tripSales = Math.max(tripSalesSum, tripShopsSalesSum);

  // 3. Trip Due (Outstanding for THIS trip)
  const tripDue = Math.max(0, tripSales - tripCollection);

  // Shop progress
  const completedShops = trip.shops.filter((s) => s.status === 'completed').length;
  const totalShops = trip.shops.length;
  const isCompleted = trip.status === 'Completed';
  const isInProgress = trip.status === 'In Progress';

  return (
    <Card
      hoverEffect
      onClick={() => onSelectTrip(trip.id)}
      className="p-5 flex flex-col justify-between border border-slate-200/90 shadow-sm transition-all cursor-pointer hover:border-slate-300"
    >
      <div>
        {/* Top Header: Vehicle Plate & Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <Truck className="w-4 h-4" />
              </div>
              <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                {trip.vehiclePlate}
              </span>
            </div>
            {/* Driver & Sales Staff */}
            <p className="text-xs text-slate-600 mt-1.5 font-medium flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-900">{trip.driverName}</strong> • {trip.staffName}
              </span>
            </p>
          </div>

          <TripStatusBadge status={trip.status} />
        </div>

        {/* Trip Duration & Shop Progress Meta */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{getTripDuration()}</span>
          </div>

          <div className="text-slate-600 font-semibold flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span>{completedShops} / {totalShops} Shops Completed</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <ProgressBar
            value={completedShops}
            max={totalShops || 1}
            color={isCompleted ? 'green' : 'primary'}
            size="sm"
            showPercent={false}
          />
        </div>

        {/* Financial Metrics Section */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
          {/* Trip Collection - Visually Prominent */}
          <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Trip Collection
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">
                  {isCompleted ? 'Final Collection' : 'Collection so far'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-0.5 font-medium">
                {isCompleted
                  ? 'Total collected during trip'
                  : 'Total collected since trip start'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                ₹{tripCollection.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Trip Sales & Trip Due Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 border border-slate-100/90 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Trip Sales
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 block">
                ₹{tripSales.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100/90 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Trip Due
              </span>
              <span
                className={`text-base sm:text-lg font-bold mt-0.5 block ${
                  tripDue > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                ₹{tripDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Button */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          {trip.loadedItems.length} Products Loaded
        </span>

        <Button
          size="sm"
          variant={isInProgress ? 'accent' : 'secondary'}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTrip(trip.id);
          }}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          {isInProgress ? 'Continue Trip' : 'View Trip'}
        </Button>
      </div>
    </Card>
  );
};
