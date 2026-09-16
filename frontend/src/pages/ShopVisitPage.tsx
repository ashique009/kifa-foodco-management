import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RecordSaleModal } from './RecordSaleModal';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { RecordReturnModal } from './RecordReturnModal';
import {
  ArrowLeft,
  Phone,
  Store,
  Plus,
  IndianRupee,
  RotateCcw,
  Clock,
  ArrowRight,
  CheckCircle2,
  Check,
} from 'lucide-react';

interface ShopVisitPageProps {
  shopId: string;
  tripId?: string;
  onBack: () => void;
  onOpenNextShop?: (nextShopId: string) => void;
}

export const ShopVisitPage: React.FC<ShopVisitPageProps> = ({
  shopId,
  tripId,
  onBack,
  onOpenNextShop,
}) => {
  const { shops, sales, payments, returns, trips, markShopVisited } = useBakery();

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const shop = shops.find((s) => s.id === shopId);
  const activeTrip = tripId ? trips.find((t) => t.id === tripId) : undefined;
  const tripShopEntry = activeTrip?.shops.find((s) => s.shopId === shopId);
  const isVisitedOnTrip = tripShopEntry?.status === 'completed';

  if (!shop) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Shop not found.</p>
        <Button size="sm" onClick={onBack} className="mt-3">
          Back
        </Button>
      </div>
    );
  }

  // Find next pending shop on this trip
  let nextShopOnTrip: { shopId: string; shopName: string } | undefined;
  if (activeTrip) {
    const currentIndex = activeTrip.shops.findIndex((s) => s.shopId === shopId);
    const remainingShops = activeTrip.shops.filter(
      (s, idx) => idx > currentIndex && s.status === 'pending'
    );
    if (remainingShops.length > 0) {
      nextShopOnTrip = {
        shopId: remainingShops[0].shopId,
        shopName: remainingShops[0].shopName,
      };
    }
  }

  // Activity done at this shop
  const shopSales = sales.filter((s) => s.shopId === shop.id);
  const shopPayments = payments.filter((p) => p.shopId === shop.id);
  const shopReturns = returns.filter((r) => r.shopId === shop.id);

  // Check if today's visit has completed work
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasCompletedWork =
    shopSales.some((s) => s.tripId === tripId || s.date === todayStr) ||
    shopPayments.some((p) => p.tripId === tripId || p.date === todayStr) ||
    shopReturns.some((r) => r.tripId === tripId || r.date === todayStr);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      {/* Mobile Top Navigation (Section 14: ← Back to Trip and Next Shop →) */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Trip</span>
        </button>

        {nextShopOnTrip && onOpenNextShop ? (
          <button
            onClick={() => onOpenNextShop(nextShopOnTrip!.shopId)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#172554] hover:text-blue-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            <span>Next: {nextShopOnTrip.shopName}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {activeTrip ? 'Final Stop on Route' : 'Shop Profile'}
          </span>
        )}
      </div>

      {/* Main Shop Header: Name, Owner, Phone, Outstanding (Section 4) */}
      <Card className="p-5 border-slate-200 bg-white shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#172554]" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{shop.name}</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Owner: <strong className="text-slate-800 font-semibold">{shop.owner}</strong>
            </p>
          </div>

          <a
            href={`tel:${shop.phone}`}
            className="flex items-center gap-1.5 bg-blue-50 text-[#172554] px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-100 transition-colors shrink-0"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{shop.phone}</span>
          </a>
        </div>

        {/* Outstanding Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Outstanding</span>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              ₹{shop.outstanding.toLocaleString('en-IN')}
            </span>
          </div>

          {shop.outstanding > 0 ? (
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-md border border-rose-200">
              Payment Due
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
              All Settled ✓
            </span>
          )}
        </div>
      </Card>

      {/* 3 Prominent Primary Action Buttons (Section 4) */}
      <div className="space-y-2.5">
        <button
          onClick={() => setIsSaleModalOpen(true)}
          className="w-full flex items-center justify-between p-4 bg-[#172554] text-white rounded-xl shadow-md hover:bg-[#0F172A] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F59E0B] text-slate-950 flex items-center justify-center font-bold">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold tracking-tight text-white">
                + Record Sale
              </span>
              <span className="block text-xs text-slate-300">Deliver bakery items &amp; bill shop</span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#F59E0B] bg-blue-900/60 px-3 py-1.5 rounded-lg">
            Record Sale
          </span>
        </button>

        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="w-full flex items-center justify-between p-4 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold tracking-tight text-white">
                Receive Payment
              </span>
              <span className="block text-xs text-emerald-100">Collect cash, UPI or card</span>
            </div>
          </div>
          <span className="text-xs font-bold text-white bg-emerald-800/40 px-3 py-1.5 rounded-lg">
            Collect
          </span>
        </button>

        <button
          onClick={() => setIsReturnModalOpen(true)}
          className="w-full flex items-center justify-between p-3.5 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 active:scale-[0.99] transition-all shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-slate-900">
                Record Return
              </span>
              <span className="block text-[11px] text-slate-500">Unsold, expired or damaged stock</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600">Return</span>
        </button>

        {/* Mark Visited (No Sale) button */}
        {activeTrip && !isVisitedOnTrip && (
          <button
            type="button"
            onClick={() => markShopVisited(activeTrip.id, shop.id)}
            className="w-full flex items-center justify-between p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl hover:bg-emerald-100 active:scale-[0.99] transition-all shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-emerald-950">
                  Mark as Visited (No Sale)
                </span>
                <span className="block text-[11px] text-emerald-700">Checked store stock / visited without transaction</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-white/70 px-2.5 py-1 rounded-md border border-emerald-300">
              Mark Visited
            </span>
          </button>
        )}
      </div>

      {/* SECTION 12: NEXT SHOP PROMPT AFTER COMPLETION */}
      {(isVisitedOnTrip || hasCompletedWork) && (
        <Card className="p-4 border-[#172554] bg-blue-50/50 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>✓ {shop.name} visit completed</span>
          </div>

          {nextShopOnTrip && onOpenNextShop ? (
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  NEXT SHOP
                </span>
                <span className="text-base font-bold text-slate-900">{nextShopOnTrip.shopName}</span>
              </div>
              <Button
                variant="accent"
                size="md"
                className="font-bold shadow-sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => onOpenNextShop(nextShopOnTrip!.shopId)}
              >
                Go to {nextShopOnTrip.shopName} →
              </Button>
            </div>
          ) : (
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">All stops visited!</span>
              <Button variant="primary" size="sm" onClick={onBack}>
                Return to Trip &amp; Complete →
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* SECTION 11: RECENT SHOP ACTIVITY TIMELINE */}
      <Card className="p-4 border-slate-200">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Recent Activity
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Activity Timeline</span>
        </div>

        <div className="space-y-2 text-xs">
          {shopSales.slice(0, 2).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="font-semibold text-slate-900">Sale</span>
                <span className="text-[11px] text-slate-400">
                  {s.time || '10:20 AM'}
                </span>
              </div>
              <span className="font-bold text-slate-900">
                ₹{s.total.toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          {shopPayments.slice(0, 2).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="font-semibold text-emerald-950">Payment</span>
                <span className="text-[11px] text-emerald-700">
                  {p.method} • 10:25 AM
                </span>
              </div>
              <span className="font-bold text-emerald-700">
                ₹{p.amount.toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          {shopReturns.slice(0, 1).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-100 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span className="font-semibold text-amber-950">Return</span>
                <span className="text-[11px] text-amber-700">
                  {r.reason} • 10:30 AM
                </span>
              </div>
              <span className="font-bold text-amber-800">
                ₹{(r.quantity * 30).toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          {shopSales.length === 0 && shopPayments.length === 0 && shopReturns.length === 0 && (
            <div className="py-3 text-center text-xs text-slate-400">
              No recent activity recorded for this shop yet.
            </div>
          )}
        </div>
      </Card>

      {/* Action Modals with Context Pre-filled and Locked */}
      <RecordSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        shopId={shop.id}
        tripId={tripId}
      />

      <ReceivePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        shopId={shop.id}
        tripId={tripId}
      />

      <RecordReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        shopId={shop.id}
        tripId={tripId}
      />
    </div>
  );
};
