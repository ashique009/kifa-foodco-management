import React, { useState, useEffect } from 'react';
import { Search, Store, Package, Truck, ArrowRight, X } from 'lucide-react';
import { useBakery } from '../../context/BakeryContext';
import { NavigationPage } from './Sidebar';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: NavigationPage) => void;
  onSelectShop: (shopId: string) => void;
  onSelectTrip: (tripId: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectShop,
  onSelectTrip,
}) => {
  const { shops, products, trips } = useBakery();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredShops = query.trim()
    ? shops.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.owner.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : [];

  const filteredProducts = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : [];

  const filteredTrips = query.trim()
    ? trips.filter(
        (t) =>
          t.vehiclePlate.toLowerCase().includes(query.toLowerCase()) ||
          t.tripNumber.toLowerCase().includes(query.toLowerCase()) ||
          t.driverName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3)
    : [];

  const quickPages: { id: NavigationPage; label: string }[] = [
    { id: 'trips', label: 'Trips & Dispatch' },
    { id: 'sales', label: 'Sales Invoices' },
    { id: 'stock', label: 'Godown Stock' },
    { id: 'payments', label: 'Payment Collections' },
    { id: 'reports', label: 'Business Reports' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:p-6 sm:pt-24 text-left">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Input Header */}
          <div className="flex items-center px-4 py-3 border-b border-slate-200">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input
              type="text"
              autoFocus
              placeholder="Search shops, products, trips, or jump to page..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="p-2 max-h-96 overflow-y-auto space-y-3">
            {query.trim() === '' ? (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                  Quick Navigation
                </p>
                <div className="space-y-0.5">
                  {quickPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        onNavigate(page.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <span>{page.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {filteredShops.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                      Shops
                    </p>
                    {filteredShops.map((shop) => (
                      <button
                        key={shop.id}
                        onClick={() => {
                          onSelectShop(shop.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <Store className="w-4 h-4 text-slate-400" />
                          <span>{shop.name}</span>
                          <span className="text-slate-400">({shop.owner})</span>
                        </div>
                        {shop.outstanding > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            Due ₹{shop.outstanding.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Settled</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {filteredProducts.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                      Products
                    </p>
                    {filteredProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          onNavigate('products');
                          onClose();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span>{prod.name}</span>
                          <span className="text-slate-400">[{prod.sku}]</span>
                        </div>
                        <span className="text-slate-900 font-semibold">
                          ₹{prod.sellingPrice} / {prod.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredTrips.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                      Trips
                    </p>
                    {filteredTrips.map((trip) => (
                      <button
                        key={trip.id}
                        onClick={() => {
                          onSelectTrip(trip.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-800 hover:bg-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span>{trip.vehiclePlate}</span>
                          <span className="text-slate-400">({trip.driverName})</span>
                        </div>
                        <span className="font-semibold text-amber-600">{trip.status}</span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredShops.length === 0 &&
                  filteredProducts.length === 0 &&
                  filteredTrips.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No matching shops, products or trips found for "{query}".
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
