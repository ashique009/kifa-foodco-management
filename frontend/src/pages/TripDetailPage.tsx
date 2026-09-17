import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TripStatusBadge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Circle,
  Play,
  CheckCheck,
  PackageCheck,
  Store,
  Phone,
  ArrowRight,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { TripStatus, TripLoadedItem } from '../types';

interface TripDetailPageProps {
  tripId: string;
  onBack: () => void;
  onOpenShopVisit: (shopId: string) => void;
}

export const TripDetailPage: React.FC<TripDetailPageProps> = ({
  tripId,
  onBack,
  onOpenShopVisit,
}) => {
  const {
    trips,
    shops,
    updateTripStatus,
    markShopVisited,
    sales,
    payments,
    returns,
    recordTransitDamage,
    addShopToActiveTrip,
  } = useBakery();
  const [activeTab, setActiveTab] = useState<'shops' | 'stock'>('shops');
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  // Status transition & action loading states
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [visitedLoadingMap, setVisitedLoadingMap] = useState<{ [shopId: string]: boolean }>({});

  // Add Shop to Active Trip Modal state
  const [isAddShopModalOpen, setIsAddShopModalOpen] = useState(false);
  const [addShopTab, setAddShopTab] = useState<'new' | 'existing'>('new');
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [selectedExistingShopId, setSelectedExistingShopId] = useState('');
  const [isSubmittingAddShop, setIsSubmittingAddShop] = useState(false);
  const [addShopError, setAddShopError] = useState('');

  // Transit Damage Modal state
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [damageProductId, setDamageProductId] = useState('');
  const [damageQty, setDamageQty] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [isSubmittingDamage, setIsSubmittingDamage] = useState(false);
  const [damageError, setDamageError] = useState('');

  const trip = trips.find((t) => t.id === tripId);

  if (!trip) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Trip not found.</p>
        <Button size="sm" onClick={onBack} className="mt-3">
          Back to Trips
        </Button>
      </div>
    );
  }

  const completedShopsList = trip.shops.filter((s) => s.status === 'completed');
  const pendingShopsList = trip.shops.filter((s) => s.status === 'pending');
  const completedShops = completedShopsList.length;
  const totalShops = trip.shops.length;
  const allCompleted = completedShops === totalShops && totalShops > 0;
  const unassignedShops = shops.filter((s) => !trip.shops.some((ts) => ts.shopId === s.id));

  // The very next shop to visit
  const nextShop = pendingShopsList[0];

  // Trip financial and stock totals for completion summary (Section 13)
  const tripSales = sales.filter((s) => s.tripId === trip.id);
  const tripSalesTotal = tripSales.reduce((sum, s) => sum + s.total, 0);

  const tripPayments = payments.filter((p) => p.tripId === trip.id);
  const tripCollectionTotal = tripPayments.reduce((sum, p) => sum + p.amount, 0);

  const tripReturns = returns.filter((r) => r.tripId === trip.id);
  const tripReturnsTotal = tripReturns.reduce((sum, r) => sum + r.quantity * 30, 0); // approximate value

  const getVanBalance = (item: TripLoadedItem) => {
    if (trip.status === 'Completed') return 0;
    if (item.vanBalance !== undefined) return item.vanBalance;
    return Math.max(0, item.loadedQty - item.soldQty - (item.damagedQty || 0) + item.returnedQty);
  };

  const remainingVanStockUnits = trip.loadedItems.reduce(
    (sum, item) => sum + getVanBalance(item),
    0
  );

  const handleRecordDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageProductId) {
      setDamageError('Please select a product');
      return;
    }
    const qty = Number(damageQty);
    if (isNaN(qty) || qty <= 0) {
      setDamageError('Quantity must be greater than 0');
      return;
    }
    const selectedItem = trip.loadedItems.find((i) => i.productId === damageProductId);
    const available = selectedItem ? getVanBalance(selectedItem) : 0;
    if (qty > available) {
      setDamageError(`Quantity cannot exceed available stock (${available} ${selectedItem?.unit || 'units'})`);
      return;
    }

    setIsSubmittingDamage(true);
    setDamageError('');
    try {
      const success = await recordTransitDamage(trip.id, {
        product_id: damageProductId,
        quantity: qty,
        notes: damageNotes.trim() || undefined,
        idempotency_key: crypto.randomUUID(),
      });
      if (success) {
        setIsDamageModalOpen(false);
        setDamageQty('');
        setDamageNotes('');
      }
    } finally {
      setIsSubmittingDamage(false);
    }
  };

  const handleStatusTransition = async () => {
    if (isStatusUpdating) return;
    if (trip.status === 'Draft') {
      setIsStatusUpdating(true);
      try {
        await updateTripStatus(trip.id, 'Loaded');
      } finally {
        setIsStatusUpdating(false);
      }
    } else if (trip.status === 'Loaded') {
      setIsStatusUpdating(true);
      try {
        await updateTripStatus(trip.id, 'In Progress');
      } finally {
        setIsStatusUpdating(false);
      }
    } else if (trip.status === 'In Progress') {
      if (allCompleted) {
        setIsCompleteDialogOpen(true);
      } else if (nextShop) {
        onOpenShopVisit(nextShop.shopId);
      }
    }
  };

  const handleConfirmComplete = async () => {
    if (isCompletingTrip) return;
    setIsCompletingTrip(true);
    try {
      await updateTripStatus(trip.id, 'Completed');
      setIsCompleteDialogOpen(false);
    } finally {
      setIsCompletingTrip(false);
    }
  };

  const handleMarkVisited = async (shopId: string) => {
    if (visitedLoadingMap[shopId]) return;
    setVisitedLoadingMap((prev) => ({ ...prev, [shopId]: true }));
    try {
      await markShopVisited(trip.id, shopId);
    } finally {
      setVisitedLoadingMap((prev) => ({ ...prev, [shopId]: false }));
    }
  };

  const handleAddShopToTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAddShop) return;

    setAddShopError('');

    if (addShopTab === 'new') {
      if (!newShopName.trim()) {
        setAddShopError('Shop name is required');
        return;
      }
      setIsSubmittingAddShop(true);
      try {
        const result = await addShopToActiveTrip(trip.id, {
          name: newShopName.trim(),
          owner: newOwnerName.trim() || undefined,
          phone: newPhone.trim() || undefined,
          address: newAddress.trim() || undefined,
          creditLimit: newCreditLimit ? Number(newCreditLimit) : 0,
        });
        if (result.success) {
          setIsAddShopModalOpen(false);
          setNewShopName('');
          setNewOwnerName('');
          setNewPhone('');
          setNewAddress('');
          setNewCreditLimit('');
        }
      } catch (err: any) {
        setAddShopError(err.message || 'Failed to add shop to trip');
      } finally {
        setIsSubmittingAddShop(false);
      }
    } else {
      if (!selectedExistingShopId) {
        setAddShopError('Please select an existing shop to add');
        return;
      }
      setIsSubmittingAddShop(true);
      try {
        const result = await addShopToActiveTrip(trip.id, undefined, selectedExistingShopId);
        if (result.success) {
          setIsAddShopModalOpen(false);
          setSelectedExistingShopId('');
        }
      } catch (err: any) {
        setAddShopError(err.message || 'Failed to add shop to trip');
      } finally {
        setIsSubmittingAddShop(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28 lg:pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Today's Trip</h1>
              <TripStatusBadge status={trip.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{trip.tripNumber}</p>
          </div>
        </div>

        {/* Desktop Primary Action */}
        <div className="hidden sm:block">
          {trip.status === 'Draft' && (
            <Button
              variant="accent"
              size="md"
              leftIcon={<PackageCheck className="w-4 h-4" />}
              isLoading={isStatusUpdating}
              disabled={isStatusUpdating}
              onClick={handleStatusTransition}
            >
              {isStatusUpdating ? 'Loading Stock...' : 'Load Stock'}
            </Button>
          )}
          {trip.status === 'Loaded' && (
            <Button
              variant="accent"
              size="md"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              isLoading={isStatusUpdating}
              disabled={isStatusUpdating}
              onClick={handleStatusTransition}
            >
              {isStatusUpdating ? 'Starting Trip...' : 'Start Trip'}
            </Button>
          )}
          {trip.status === 'In Progress' && (
            <div className="flex items-center gap-2">
              {nextShop && (
                <Button
                  variant="accent"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => onOpenShopVisit(nextShop.shopId)}
                >
                  Continue Trip
                </Button>
              )}
              <Button
                variant={allCompleted ? 'success' : 'secondary'}
                size="md"
                leftIcon={<CheckCheck className="w-4 h-4" />}
                isLoading={isCompletingTrip}
                disabled={isCompletingTrip}
                onClick={() => setIsCompleteDialogOpen(true)}
              >
                Complete Trip
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Trip Information Card (Section 2) */}
      <Card className="p-5 border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#172554]" />
              <span className="text-lg font-bold text-slate-900">{trip.vehiclePlate}</span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              {trip.driverName} • {trip.staffName}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-900 block">
              {completedShops} of {totalShops} shops completed
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {totalShops - completedShops > 0
                ? `${totalShops - completedShops} stops remaining`
                : 'All stops visited ✓'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            value={completedShops}
            max={totalShops || 1}
            color={allCompleted ? 'green' : 'primary'}
            size="md"
            showPercent={true}
          />
        </div>
      </Card>

      {/* SECTION 13: ALL SHOPS COMPLETED TRIP SUMMARY */}
      {allCompleted && trip.status !== 'Completed' && (
        <Card className="p-5 border-emerald-300 bg-emerald-50/50 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold tracking-tight">All shops completed ✓</h3>
          </div>

          <p className="text-xs text-emerald-700">
            All {totalShops} retail stores on today's route have been visited and recorded.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Shops Visited
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {completedShops} / {totalShops}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Sales
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                ₹{tripSalesTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Collection
              </span>
              <span className="text-base font-black text-emerald-600 mt-0.5 block">
                ₹{tripCollectionTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Returns
              </span>
              <span className="text-base font-black text-amber-700 mt-0.5 block">
                ₹{tripReturnsTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Remaining Trip Stock in Van:</span>
            <span className="font-bold text-[#172554]">
              {remainingVanStockUnits} units to reconcile into godown
            </span>
          </div>

          <Button
            variant="success"
            size="lg"
            className="w-full font-bold shadow-md text-sm py-3"
            leftIcon={<CheckCheck className="w-5 h-5" />}
            onClick={() => setIsCompleteDialogOpen(true)}
          >
            Complete Trip
          </Button>
        </Card>
      )}

      {/* SECTION 2: NEXT SHOP HERO CARD (High-visibility focus) */}
      {nextShop && trip.status === 'In Progress' && (
        <div className="bg-[#172554] text-white p-4 sm:p-5 rounded-xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#F59E0B] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              NEXT SHOP TO VISIT
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Stop #{nextShop.sequence} of {totalShops}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">{nextShop.shopName}</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Owner: {nextShop.ownerName} • Phone: {nextShop.phone}
              </p>
            </div>

            <Button
              variant="accent"
              size="lg"
              className="font-bold shadow-md text-slate-950 self-start sm:self-center shrink-0"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onOpenShopVisit(nextShop.shopId)}
            >
              Open Shop →
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('shops')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'shops'
              ? 'border-[#172554] text-[#172554]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shops Checklist ({completedShops}/{totalShops})</span>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'border-[#172554] text-[#172554]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Van Stock &amp; Reconciliation</span>
        </button>
      </div>

      {/* Tab 1: Shop Stops Grouped into Pending & Completed (Section 2) */}
      {activeTab === 'shops' && (
        <div className="space-y-5">
          {/* Action Bar for Route Shops */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Route Shops ({completedShops}/{totalShops})
              </span>
              <p className="text-[11px] text-slate-500">
                {trip.status === 'Completed' || trip.status === 'Cancelled'
                  ? 'Trip is completed'
                  : 'Add an unplanned shop to this active route or record visits'}
              </p>
            </div>
            {trip.status !== 'Completed' && trip.status !== 'Cancelled' && (
              <Button
                variant="accent"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setAddShopError('');
                  setIsAddShopModalOpen(true);
                }}
              >
                + Add Shop to Route
              </Button>
            )}
          </div>

          {totalShops === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-3">
              <Store className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No shops assigned to this trip yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add an unplanned shop to this route now to begin recording deliveries and sales.
              </p>
              {trip.status !== 'Completed' && trip.status !== 'Cancelled' && (
                <Button
                  variant="accent"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setAddShopError('');
                    setIsAddShopModalOpen(true);
                  }}
                >
                  + Add First Shop to Route
                </Button>
              )}
            </div>
          )}

          {/* PENDING SHOPS */}
          {pendingShopsList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pending Shops ({pendingShopsList.length})
                </span>
                <span className="text-[11px] text-amber-600 font-medium">To be visited</span>
              </div>

              {pendingShopsList.map((shop) => {
                const isCurrentNext = nextShop?.shopId === shop.shopId;
                return (
                  <Card
                    key={shop.shopId}
                    hoverEffect
                    className={`p-4 transition-all cursor-pointer border ${
                      isCurrentNext
                        ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() => onOpenShopVisit(shop.shopId)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Circle
                          className={`w-5 h-5 shrink-0 ${
                            isCurrentNext ? 'text-[#F59E0B] stroke-[2.5]' : 'text-slate-300'
                          }`}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-400">
                              #{shop.sequence}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{shop.shopName}</h4>
                            {isCurrentNext && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                Up Next
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {shop.ownerName} • {shop.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs px-2.5 font-medium flex-1 sm:flex-none justify-center"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                          isLoading={Boolean(visitedLoadingMap[shop.shopId])}
                          disabled={Boolean(visitedLoadingMap[shop.shopId])}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkVisited(shop.shopId);
                          }}
                        >
                          Mark Visited
                        </Button>
                        <Button
                          size="sm"
                          variant={isCurrentNext ? 'accent' : 'secondary'}
                          className="flex-1 sm:flex-none justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenShopVisit(shop.shopId);
                          }}
                        >
                          Visit Shop
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* COMPLETED SHOPS */}
          {completedShopsList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Completed Shops ({completedShopsList.length})
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">Delivered ✓</span>
              </div>

              {completedShopsList.map((shop) => (
                <Card
                  key={shop.shopId}
                  hoverEffect
                  className="p-3.5 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40 transition-all cursor-pointer"
                  onClick={() => onOpenShopVisit(shop.shopId)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{shop.shopName}</h4>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                            Visited ✓
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {shop.ownerName} • {shop.visitedAt ? `Visited at ${shop.visitedAt}` : 'Done'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {shop.paymentReceived !== undefined && shop.paymentReceived > 0 && (
                        <div className="text-right hidden sm:block">
                          <span className="text-xs font-bold text-emerald-700 block">
                            +₹{shop.paymentReceived.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">Collected</span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShopVisit(shop.shopId);
                        }}
                      >
                        View Visit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Van Stock Reconciliation */}
      {activeTab === 'stock' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Van Inventory & Reconciliation</h3>
              <p className="text-xs text-slate-500">Live vehicle stock during route</p>
            </div>
            {trip.status === 'In Progress' && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                onClick={() => {
                  setDamageProductId(trip.loadedItems[0]?.productId || '');
                  setDamageQty('');
                  setDamageNotes('');
                  setDamageError('');
                  setIsDamageModalOpen(true);
                }}
                className="text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                Record Damage
              </Button>
            )}
          </div>

          {/* MOBILE VAN STOCK CARDS */}
          <div className="md:hidden space-y-2.5">
            {trip.loadedItems.map((item) => {
              const balanceInVan = getVanBalance(item);
              return (
                <Card key={item.productId} className="p-3.5 border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.productName}</h4>
                      <span className="text-xs text-slate-500 mt-0.5 block">₹{item.unitPrice} / {item.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Van Balance</span>
                      <span className="text-base font-black text-[#172554] block">
                        {balanceInVan} {item.unit}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Loaded</span>
                      <span className="font-bold text-slate-800">{item.loadedQty}</span>
                    </div>
                    <div className="bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 block">Sold</span>
                      <span className="font-bold text-emerald-700">{item.soldQty}</span>
                    </div>
                    <div className="bg-rose-50/60 p-1.5 rounded-lg border border-rose-100">
                      <span className="text-[10px] text-rose-600 block">Damaged</span>
                      <span className="font-bold text-rose-700">{item.damagedQty || 0}</span>
                    </div>
                    <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-amber-600 block">Returned</span>
                      <span className="font-bold text-amber-700">{item.returnedQty}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* DESKTOP VAN STOCK TABLE */}
          <Card className="hidden md:block overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3 text-center">Loaded</th>
                    <th className="py-3 px-3 text-center">Sold</th>
                    <th className="py-3 px-3 text-center">Damaged</th>
                    <th className="py-3 px-3 text-center">Returned</th>
                    <th className="py-3 px-3 text-center">Balance in Van</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trip.loadedItems.map((item) => {
                    const balanceInVan = getVanBalance(item);
                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {item.loadedQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">
                          {item.soldQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-rose-600">
                          {item.damagedQty || 0} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-600">
                          {item.returnedQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#172554]">
                          {balanceInVan} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 font-medium">
                          ₹{item.unitPrice}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* STICKY BOTTOM MOBILE ACTION BAR (Section 9) */}
      {trip.status !== 'Completed' && (
        <div className="fixed bottom-14 sm:hidden left-0 right-0 z-20 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-3 shadow-lg">
          {trip.status === 'Draft' && (
            <Button
              variant="accent"
              size="lg"
              className="w-full shadow-md font-bold py-3"
              leftIcon={<PackageCheck className="w-4 h-4" />}
              isLoading={isStatusUpdating}
              disabled={isStatusUpdating}
              onClick={handleStatusTransition}
            >
              {isStatusUpdating ? 'Loading Stock...' : 'Load Stock'}
            </Button>
          )}
          {trip.status === 'Loaded' && (
            <Button
              variant="accent"
              size="lg"
              className="w-full shadow-md font-bold py-3"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              isLoading={isStatusUpdating}
              disabled={isStatusUpdating}
              onClick={handleStatusTransition}
            >
              {isStatusUpdating ? 'Starting Trip...' : 'Start Trip'}
            </Button>
          )}
          {trip.status === 'In Progress' && (
            <div className="flex items-center gap-2">
              {nextShop ? (
                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1 shadow-md font-bold py-3 min-w-0"
                  rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
                  onClick={() => onOpenShopVisit(nextShop.shopId)}
                >
                  <span className="truncate">Continue Trip ({nextShop.shopName})</span>
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="lg"
                  className="w-full shadow-md font-bold py-3"
                  leftIcon={<CheckCheck className="w-4 h-4" />}
                  isLoading={isCompletingTrip}
                  disabled={isCompletingTrip}
                  onClick={() => setIsCompleteDialogOpen(true)}
                >
                  Complete Trip ✓
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Complete Trip Confirmation Modal */}
      <ConfirmDialog
        isOpen={isCompleteDialogOpen}
        onClose={() => !isCompletingTrip && setIsCompleteDialogOpen(false)}
        onConfirm={handleConfirmComplete}
        isLoading={isCompletingTrip}
        title={allCompleted ? 'Complete and Reconcile Trip?' : 'Complete Trip with Pending Shops?'}
        message={
          allCompleted
            ? `Are you sure you want to complete this trip? All ${completedShops} visited shops will be finalized and remaining van stock will be returned to godown inventory.`
            : `Warning: ${pendingShopsList.length} of ${totalShops} shops are still unvisited. Completing the trip now will finalize the trip with ${completedShops}/${totalShops} shops visited and return remaining van stock to godown.`
        }
        confirmText={allCompleted ? 'Complete Trip' : 'Complete with Pending Shops'}
        variant={allCompleted ? 'primary' : 'danger'}
      />

      {/* Add Shop to Trip Route Modal */}
      <Modal
        isOpen={isAddShopModalOpen}
        onClose={() => {
          if (!isSubmittingAddShop) {
            setIsAddShopModalOpen(false);
            setAddShopError('');
          }
        }}
        title="Add Shop to Trip Route"
        maxWidth="md"
      >
        <form onSubmit={handleAddShopToTripSubmit} className="space-y-4 text-xs">
          {/* Tab Selection between New Shop and Existing Registered Shop */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAddShopTab('new');
                setAddShopError('');
              }}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                addShopTab === 'new'
                  ? 'border-[#172554] text-[#172554]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              + Create &amp; Add New Shop
            </button>
            <button
              type="button"
              onClick={() => {
                setAddShopTab('existing');
                setAddShopError('');
              }}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                addShopTab === 'existing'
                  ? 'border-[#172554] text-[#172554]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Select Existing Shop ({unassignedShops.length})
            </button>
          </div>

          {addShopTab === 'new' ? (
            <div className="space-y-3 pt-1">
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                Encountered an unplanned shop on route? Enter the shop details below. It will be registered in the system and automatically attached as a valid stop on this active trip.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Shop Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Malabar Bakery &amp; Sweets"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Near Bus Stand, Main Road"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
                Choose an already registered shop from your directory that was not originally scheduled for today's trip.
              </div>

              {unassignedShops.length === 0 ? (
                <div className="p-4 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  All active registered shops are already assigned to this trip.
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Shop <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedExistingShopId}
                    onChange={(e) => setSelectedExistingShopId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose registered shop --</option>
                    {unassignedShops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.owner ? `(${s.owner})` : ''} {s.phone ? `- ${s.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {addShopError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
              {addShopError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingAddShop}
              onClick={() => {
                setIsAddShopModalOpen(false);
                setAddShopError('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              isLoading={isSubmittingAddShop}
              disabled={
                isSubmittingAddShop ||
                (addShopTab === 'new' ? !newShopName.trim() : !selectedExistingShopId)
              }
            >
              {isSubmittingAddShop
                ? 'Adding to Route...'
                : addShopTab === 'new'
                ? 'Create & Add to Route'
                : 'Add to Route'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Transit Damage Modal */}
      <Modal
        isOpen={isDamageModalOpen}
        onClose={() => {
          if (!isSubmittingDamage) {
            setIsDamageModalOpen(false);
            setDamageError('');
          }
        }}
        title="Record Transit Damage"
        description="Deduct goods damaged in transit from active vehicle stock."
      >
        <form onSubmit={handleRecordDamage} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Product
            </label>
            <select
              value={damageProductId}
              onChange={(e) => {
                setDamageProductId(e.target.value);
                setDamageError('');
              }}
              className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Product --</option>
              {trip.loadedItems.map((item) => {
                const available = getVanBalance(item);
                return (
                  <option key={item.productId} value={item.productId}>
                    {item.productName} (Available: {available} {item.unit})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Damaged Quantity
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={damageQty}
              onChange={(e) => {
                setDamageQty(e.target.value);
                setDamageError('');
              }}
              placeholder="e.g. 2"
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {damageProductId && (
              <p className="mt-1 text-xs text-slate-500">
                Max available:{' '}
                {getVanBalance(
                  trip.loadedItems.find((i) => i.productId === damageProductId) || trip.loadedItems[0]
                )}{' '}
                units
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. Packaging crushed during transit"
              className="w-full text-sm rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {damageError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
              {damageError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingDamage}
              onClick={() => setIsDamageModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingDamage}
              disabled={isSubmittingDamage || !damageProductId || !damageQty}
              className="bg-rose-600 hover:bg-rose-700 border-rose-600 text-white"
            >
              {isSubmittingDamage ? 'Recording...' : 'Confirm Damage'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
