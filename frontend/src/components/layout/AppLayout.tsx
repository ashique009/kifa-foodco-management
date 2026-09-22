import React, { useState } from 'react';
import { Sidebar, NavigationPage } from './Sidebar';
import { Header } from './Header';
import { ActiveTripBanner } from './ActiveTripBanner';
import { MobileBottomNav } from './MobileBottomNav';
import { QuickSearchModal } from './QuickSearchModal';
import { ToastContainer } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Plus, ShoppingCart, IndianRupee, Truck, RotateCcw } from 'lucide-react';
import { useBakery } from '../../context/BakeryContext';

interface AppLayoutProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  onSelectTrip: (tripId: string) => void;
  onSelectShop: (shopId: string) => void;
  onOpenRecordSale: () => void;
  onOpenReceivePayment: () => void;
  onOpenNewTrip: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  onSelectTrip,
  onSelectShop,
  onOpenRecordSale,
  onOpenReceivePayment,
  onOpenNewTrip,
  children,
}) => {
  const { canManage } = useBakery();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Desktop Left Sidebar & Mobile Drawer */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigate={onNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Prominent Active Trip Banner (if any trip is currently active) */}
        <ActiveTripBanner onNavigateToTrip={onSelectTrip} />

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 pwa-main-bottom lg:pb-8">
          {children}
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={onNavigate}
          onQuickAction={() => setIsQuickActionModalOpen(true)}
        />
      </div>

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Global Quick Search Modal (Cmd+K) */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
        onSelectShop={onSelectShop}
        onSelectTrip={onSelectTrip}
      />

      {/* Mobile Center Quick Action Modal */}
      <Modal
        isOpen={isQuickActionModalOpen}
        onClose={() => setIsQuickActionModalOpen(false)}
        title="Quick Action"
        description="Select a business activity to launch"
        maxWidth="sm"
      >
        <div className="space-y-2.5">
          <button
            onClick={() => {
              setIsQuickActionModalOpen(false);
              onOpenRecordSale();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 transition-colors text-left"
          >
            <div className="p-2 bg-[#172554] text-white rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">Record Sale</span>
              <span className="block text-[11px] text-slate-500">Deliver bakery items &amp; bill shop</span>
            </div>
          </button>

          <button
            onClick={() => {
              setIsQuickActionModalOpen(false);
              onOpenReceivePayment();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-colors text-left"
          >
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900">Receive Payment</span>
              <span className="block text-[11px] text-slate-500">Collect cash, UPI or card</span>
            </div>
          </button>

          {canManage && (
            <button
              onClick={() => {
                setIsQuickActionModalOpen(false);
                onOpenNewTrip();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 transition-colors text-left"
            >
              <div className="p-2 bg-[#F59E0B] text-slate-950 rounded-lg">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900">Create New Trip</span>
                <span className="block text-[11px] text-slate-500">Dispatch vehicle and load stock</span>
              </div>
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
};
