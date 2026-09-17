import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Search,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
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
  settings: { title: 'Settings', subtitle: 'Business profile, invoice configuration, and system access' },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileMenu,
  onNavigate,
  onOpenSearch,
}) => {
  const { currentUser, logout } = useBakery();
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

  const pageInfo = pageTitles[currentPage] || { title: 'Kifa Food Co.', subtitle: 'Distribution & Operations' };

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
        <div className="flex items-center gap-1.5 lg:hidden border-r border-slate-200 pr-2 sm:pr-2.5 mr-0.5">
          <img
            src={logoImg}
            alt="Kifa Food Co."
            className="w-7 h-7 rounded-md object-contain shadow-2xs shrink-0"
          />
          <div className="hidden xs:flex sm:flex flex-col">
            <span className="font-brand font-bold text-xs text-slate-900 tracking-wide leading-none">
              Kifa Food Co.
            </span>
            <span className="text-[8px] text-slate-500 font-medium uppercase tracking-wider leading-none mt-0.5">
              Distribution
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
            {pageInfo.title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block leading-none mt-0.5">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right section: Global Search, Alerts Bell, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs transition-colors"
          title="Search anything (Press /)"
          aria-label="Quick Search"
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Notifications
                </span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Coming Soon
                </span>
              </div>

              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Bell className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Coming Soon</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  Real-time business alerts and notifications will appear here in a future update.
                </p>

                {/* Subtle soft placeholder preview */}
                <div className="mt-4 pt-4 border-t border-slate-100/80 space-y-2 select-none opacity-40">
                  <div className="h-2.5 bg-slate-200 rounded-full w-3/4 mx-auto animate-pulse"></div>
                  <div className="h-2 bg-slate-100 rounded-full w-1/2 mx-auto"></div>
                </div>
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
