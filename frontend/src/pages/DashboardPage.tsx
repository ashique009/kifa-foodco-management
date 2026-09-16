import React from 'react';
import { useBakery } from '../context/BakeryContext';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { TripCard } from '../components/dashboard/TripCard';
import {
  Wallet,
  ShoppingBag,
  AlertCircle,
  Truck,
  Plus,
  ArrowRight,
  Store,
  Layers,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';

interface DashboardPageProps {
  onNavigate: (page: NavigationPage) => void;
  onSelectTrip: (tripId: string) => void;
  onOpenNewTrip: () => void;
  onOpenRecordSale: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectTrip,
  onOpenNewTrip,
  onOpenRecordSale,
}) => {
  const {
    currentUser,
    todaySalesTotal,
    todayCollectionTotal,
    totalOutstanding,
    activeTripsCount,
    trips,
    sales,
    payments,
    alerts,
  } = useBakery();

  // Currently active trips (In Progress or Loaded on route)
  const activeTrips = trips.filter(
    (t) => t.status === 'In Progress' || t.status === 'Loaded'
  );

  // Operational alerts only: Low stock, Near-expiry, Outstanding payments
  const operationalAlerts = alerts
    .filter((a) =>
      ['low_stock', 'expiring', 'outstanding'].includes(a.type)
    )
    .slice(0, 3);

  // Dynamic greeting based on the user's local browser time
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? 'Good Morning'
      : hour >= 12 && hour < 17
      ? 'Good Afternoon'
      : 'Good Evening';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Greeting & Quick Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kifa Food Co. wholesale operations, dispatches & collection overview.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onOpenRecordSale}
          >
            Record Sale
          </Button>
          <Button
            variant="accent"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onOpenNewTrip}
          >
            Create Trip
          </Button>
        </div>
      </div>

      {/* 
        TOP 4 SUMMARY CARDS ONLY:
        1. Today's Collection (Most Prominent - received today across all trips)
        2. Today's Sales
        3. Outstanding
        4. Active Trips
        (NO lifetime total collection card)
      */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Today's Collection (Most Prominent) */}
        <StatCard
          title="Today's Collection"
          value={`₹${todayCollectionTotal.toLocaleString('en-IN')}`}
          icon={<Wallet className="w-5 h-5" />}
          subtitle="Payments received today across trips"
          accentColor="green"
          isProminent={true}
          className="col-span-2 sm:col-span-1"
          onClick={() => onNavigate('payments')}
        />

        {/* Card 2: Today's Sales */}
        <StatCard
          title="Today's Sales"
          value={`₹${todaySalesTotal.toLocaleString('en-IN')}`}
          icon={<ShoppingBag className="w-5 h-5 text-[#172554]" />}
          subtitle="Total sales recorded today"
          accentColor="primary"
          onClick={() => onNavigate('sales')}
        />

        {/* Card 3: Outstanding */}
        <StatCard
          title="Outstanding"
          value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
          subtitle="Current total due from shops"
          accentColor="orange"
          onClick={() => onNavigate('shops')}
        />

        {/* Card 4: Active Trips */}
        <StatCard
          title="Active Trips"
          value={activeTripsCount}
          icon={<Truck className="w-5 h-5 text-sky-600" />}
          subtitle={`${activeTrips.length} vehicles currently on route`}
          accentColor="blue"
          onClick={() => onNavigate('trips')}
        />
      </div>

      {/* 
        CURRENT TRIPS SECTION:
        Live ongoing trips with per-trip collection so far, trip sales, trip due & actions
      */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              CURRENT TRIPS
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
              {activeTrips.length} Active
            </span>
          </div>

          <button
            onClick={() => onNavigate('trips')}
            className="text-xs font-semibold text-[#172554] hover:underline flex items-center gap-1 transition-colors"
          >
            View All Trips <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeTrips.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {activeTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                sales={sales}
                payments={payments}
                onSelectTrip={onSelectTrip}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No active trips right now</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All vehicles are currently at the godown or completed their journeys.
              </p>
            </div>
            <Button
              size="sm"
              variant="accent"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onOpenNewTrip}
            >
              Create New Trip
            </Button>
          </div>
        )}
      </div>

      {/* 
        COMPACT BUSINESS ALERTS SECTION:
        Operational alerts only: low stock, expiring batches, and overdue receivables
      */}
      {operationalAlerts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Operational Alerts
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Requires attention</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {operationalAlerts.map((alert) => {
              const isDanger = alert.severity === 'danger';
              const isStock = alert.type === 'low_stock';

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    if (alert.linkTo) {
                      const target = alert.linkTo.replace('/', '') as NavigationPage;
                      onNavigate(target);
                    }
                  }}
                  className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs cursor-pointer transition-all flex items-start gap-3 group"
                >
                  <div className="mt-0.5 shrink-0">
                    {isDanger ? (
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                        <Store className="w-4 h-4" />
                      </div>
                    ) : isStock ? (
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <Layers className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                      {alert.description}
                    </p>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0 self-center transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
