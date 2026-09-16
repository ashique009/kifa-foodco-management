import React, { useState } from 'react';
import { BakeryProvider } from './context/BakeryContext';
import { AppLayout } from './components/layout/AppLayout';
import { NavigationPage } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TripsPage } from './pages/TripsPage';
import { CreateTripPage } from './pages/CreateTripPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { ShopVisitPage } from './pages/ShopVisitPage';
import { SalesPage } from './pages/SalesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ShopsPage } from './pages/ShopsPage';
import { ShopDetailPage } from './pages/ShopDetailPage';
import { StockPage } from './pages/StockPage';
import { ProductsPage } from './pages/ProductsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { StaffPage } from './pages/StaffPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RecordSaleModal } from './pages/RecordSaleModal';
import { ReceivePaymentModal } from './pages/ReceivePaymentModal';
import { useBakery } from './context/BakeryContext';
import { LoginPage } from './pages/LoginPage';

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
      {renderView()}

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

export function App() {
  return (
    <BakeryProvider>
      <AppContent />
    </BakeryProvider>
  );
}

export default App;
