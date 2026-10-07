import React, { useState, lazy, Suspense } from 'react';
import { BakeryProvider } from './context/BakeryContext';
import { AppLayout } from './components/layout/AppLayout';
import { NavigationPage } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TripsPage } from './pages/TripsPage';
import { CreateTripPage } from './pages/CreateTripPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { ShopVisitPage } from './pages/ShopVisitPage';
import { RecordSaleModal } from './pages/RecordSaleModal';
import { ReceivePaymentModal } from './pages/ReceivePaymentModal';
import { useBakery } from './context/BakeryContext';
import { LoginPage } from './pages/LoginPage';
import { LoadingOverlay } from './components/ui/LoadingOverlay';

// Lazy-load secondary and administrative pages to split bundle size safely
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ShopsPage = lazy(() => import('./pages/ShopsPage').then((m) => ({ default: m.ShopsPage })));
const ShopDetailPage = lazy(() => import('./pages/ShopDetailPage').then((m) => ({ default: m.ShopDetailPage })));
const StockPage = lazy(() => import('./pages/StockPage').then((m) => ({ default: m.StockPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage').then((m) => ({ default: m.VehiclesPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const AppContent: React.FC = () => {
  const { isAuthenticated, login } = useBakery();
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');

  // Subview states
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState<boolean>(false);
  const [shopVisitState, setShopVisitState] = useState<{
    shopId: string;
    tripId?: string;
  } | null>(null);
  const [selectedShopDetailId, setSelectedShopDetailId] = useState<string | null>(null);

  // Global action modals
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState<boolean>(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState<boolean>(false);

  // Navigation handlers
  const handleNavigate = (page: NavigationPage) => {
    setCurrentPage(page);
    setSelectedTripId(null);
    setIsCreatingTrip(false);
    setShopVisitState(null);
    setSelectedShopDetailId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTrip = (tripId: string) => {
    setCurrentPage('trips');
    setSelectedTripId(tripId);
    setIsCreatingTrip(false);
    setShopVisitState(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectShop = (shopId: string) => {
    setCurrentPage('shops');
    setSelectedShopDetailId(shopId);
    setShopVisitState(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenShopVisit = (shopId: string) => {
    setShopVisitState({
      shopId,
      tripId: selectedTripId || undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render the current view
  const renderView = () => {
    // 1. If currently in Shop Visit flow
    if (shopVisitState) {
      return (
        <ShopVisitPage
          shopId={shopVisitState.shopId}
          tripId={shopVisitState.tripId}
          onBack={() => {
            setShopVisitState(null);
          }}
          onOpenNextShop={(nextShopId) => {
            setShopVisitState({
              shopId: nextShopId,
              tripId: shopVisitState.tripId,
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      );
    }

    // 2. If creating a trip
    if (currentPage === 'trips' && isCreatingTrip) {
      return (
        <CreateTripPage
          onBack={() => setIsCreatingTrip(false)}
          onTripCreated={(newTripId) => {
            setIsCreatingTrip(false);
            setSelectedTripId(newTripId);
          }}
        />
      );
    }

    // 3. If viewing a specific trip's detail
    if (currentPage === 'trips' && selectedTripId) {
      return (
        <TripDetailPage
          tripId={selectedTripId}
          onBack={() => setSelectedTripId(null)}
          onOpenShopVisit={handleOpenShopVisit}
        />
      );
    }

    // 4. If viewing a specific shop's account & ledger
    if (currentPage === 'shops' && selectedShopDetailId) {
      return (
        <ShopDetailPage
          shopId={selectedShopDetailId}
          onBack={() => setSelectedShopDetailId(null)}
        />
      );
    }

    // 5. Main page views
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onSelectTrip={handleSelectTrip}
            onOpenNewTrip={() => {
              setCurrentPage('trips');
              setIsCreatingTrip(true);
            }}
            onOpenRecordSale={() => setIsRecordSaleOpen(true)}
          />
        );
      case 'trips':
        return (
          <TripsPage
            onSelectTrip={handleSelectTrip}
            onOpenNewTrip={() => setIsCreatingTrip(true)}
          />
        );
      case 'sales':
        return <SalesPage onOpenRecordSale={() => setIsRecordSaleOpen(true)} />;
      case 'shops':
        return <ShopsPage onSelectShop={handleSelectShop} />;
      case 'stock':
        return <StockPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'products':
        return <ProductsPage />;
      case 'staff':
        return <StaffPage />;
      case 'vehicles':
        return <VehiclesPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onSelectTrip={handleSelectTrip}
            onOpenNewTrip={() => {
              setCurrentPage('trips');
              setIsCreatingTrip(true);
            }}
            onOpenRecordSale={() => setIsRecordSaleOpen(true)}
          />
        );
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />;
  }

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onSelectTrip={handleSelectTrip}
      onSelectShop={handleSelectShop}
      onOpenRecordSale={() => setIsRecordSaleOpen(true)}
      onOpenReceivePayment={() => setIsReceivePaymentOpen(true)}
      onOpenNewTrip={() => {
        setCurrentPage('trips');
        setIsCreatingTrip(true);
      }}
    >
      <Suspense
        fallback={
          <div className="p-12 flex items-center justify-center text-sm text-slate-500">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2.5" />
            Loading page...
          </div>
        }
      >
        {renderView()}
      </Suspense>

      {/* Global Sales Modal */}
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
      />

      {/* Global Payment Modal */}
      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        onClose={() => setIsReceivePaymentOpen(false)}
      />
    </AppLayout>
  );
};

const GlobalLoading: React.FC = () => {
  const { isGlobalLoading, globalLoadingMessage, globalLoadingSubMessage } = useBakery();
  return (
    <LoadingOverlay
      isVisible={isGlobalLoading}
      message={globalLoadingMessage}
      subMessage={globalLoadingSubMessage}
    />
  );
};

export function App() {
  return (
    <BakeryProvider>
      <GlobalLoading />
      <AppContent />
    </BakeryProvider>
  );
}

export default App;
