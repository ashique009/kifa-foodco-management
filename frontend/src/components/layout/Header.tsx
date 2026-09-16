import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Search,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Store,
  Wheat,
} from 'lucide-react';
import { useBakery } from '../../context/BakeryContext';
import { NavigationPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavigationPage;
  onOpenMobileMenu: () => void;
  onNavigate: (page: NavigationPage) => void;
  onOpenSearch: () => void;
}

const pageTitles: Record<NavigationPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: "Today's Business Overview" },
  trips: { title: 'Trips', subtitle: 'Delivery vehicle routes and stock distribution' },
  sales: { title: 'Sales', subtitle: 'Store invoices and shop billing records' },
  shops: { title: 'Shops', subtitle: 'Retail partners, routes and accounts' },
  stock: { title: 'Stock', subtitle: 'Godown inventory, batches and reorder levels' },
  payments: { title: 'Payments', subtitle: 'Collections, modes and receipts' },
  reports: { title: 'Reports', subtitle: 'Business analytics, performance and summaries' },
  products: { title: 'Products', subtitle: 'Bakery catalog, prices and SKUs' },
  staff: { title: 'Staff', subtitle: 'Delivery crew, drivers and sales representatives' },
  vehicles: { title: 'Vehicles', subtitle: 'Delivery fleet and maintenance' },
  suppliers: { title: 'Suppliers', subtitle: 'Raw materials and packaging vendors' },
  purchases: { title: 'Purchases', subtitle: 'Raw material procurement and intake' },
  expenses: { title: 'Expenses', subtitle: 'Daily fuel, repairs and crew allowances' },
  settings: { title: 'Settings', subtitle: 'Business configuration and sample data' },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileMenu,
  onNavigate,
  onOpenSearch,
}) => {
  const { alerts, currentUser, logout } = useBakery();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageInfo = pageTitles[currentPage] || { title: 'KIFA', subtitle: 'the real taste' };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/90 px-4 lg:px-8 flex items-center justify-between shadow-2xs">
      {/* Left section: Hamburger (mobile) + Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile mini brand mark */}
        <div className="flex items-center gap-1.5 lg:hidden border-r border-slate-200 pr-2.5 mr-0.5">
          <div className="w-7 h-7 rounded-lg bg-[#172554] flex items-center justify-center text-[#F59E0B] shadow-2xs">
            <Wheat className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-brand font-black text-xs text-[#172554] tracking-wider leading-none">
              KIFA
            </span>
            <span className="font-tagline italic text-[8px] text-amber-600 font-medium leading-none mt-0.5">
              the real taste
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {pageInfo.title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block leading-none mt-0.5">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right section: Global Search, Alerts Bell, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs transition-colors"
          title="Search anything (Press /)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Quick Search...</span>
          <kbd className="hidden md:inline text-[10px] bg-white border border-slate-300 rounded px-1 text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white" />
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Business Alerts ({alerts.length})
                </span>
                <span className="text-[11px] text-slate-400">Live Status</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (alert.linkTo) {
                        const target = alert.linkTo.replace('/', '') as NavigationPage;
                        onNavigate(target);
                      }
                      setIsAlertsOpen(false);
                    }}
                    className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === 'danger' ? (
                        <div className="p-1 rounded-md bg-rose-50 text-rose-600">
                          <Store className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                          <Layers className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{alert.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-2 pr-1 sm:pr-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#172554] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-500 leading-none">Admin</p>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500">{currentUser.role}</p>
              </div>
              <button
                onClick={() => {
                  onNavigate('settings');
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Settings & Preferences
              </button>
              <button
                onClick={() => {
                  onNavigate('trips');
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Switch to Driver / Crew View
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => {
                  logout();
                  setIsProfileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
