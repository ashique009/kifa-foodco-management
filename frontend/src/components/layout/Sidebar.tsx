import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import {
  LayoutDashboard,
  Truck,
  ShoppingCart,
  Store,
  Layers,
  CreditCard,
  BarChart3,
  Package,
  Users,
  Car,
  Building2,
  Receipt,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

export type NavigationPage =
  | 'dashboard'
  | 'trips'
  | 'sales'
  | 'shops'
  | 'stock'
  | 'payments'
  | 'reports'
  | 'products'
  | 'staff'
  | 'vehicles'
  | 'suppliers'
  | 'purchases'
  | 'expenses'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { currentUser } = useBakery();
  const isAdmin = currentUser.userRole === 'admin';
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);

  const mainNav = [
    { id: 'dashboard' as NavigationPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trips' as NavigationPage, label: 'Trips', icon: Truck },
    { id: 'sales' as NavigationPage, label: 'Sales', icon: ShoppingCart },
    { id: 'shops' as NavigationPage, label: 'Shops', icon: Store },
    { id: 'stock' as NavigationPage, label: 'Stock', icon: Layers },
    { id: 'payments' as NavigationPage, label: 'Payments', icon: CreditCard },
    { id: 'reports' as NavigationPage, label: 'Reports', icon: BarChart3 },
  ];

  const moreNav = [
    { id: 'products' as NavigationPage, label: 'Products', icon: Package },
    { id: 'staff' as NavigationPage, label: 'Staff', icon: Users },
    { id: 'vehicles' as NavigationPage, label: 'Vehicles', icon: Car },
    { id: 'suppliers' as NavigationPage, label: 'Suppliers', icon: Building2 },
    { id: 'purchases' as NavigationPage, label: 'Purchases', icon: Receipt },
    { id: 'expenses' as NavigationPage, label: 'Expenses', icon: Wallet },
  ];

  const isMoreActive = moreNav.some((item) => item.id === currentPage);

  const handleNavClick = (page: NavigationPage) => {
    onNavigate(page);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#172554] text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 gap-3 border-b border-blue-900/50 bg-[#0F172A]">
          <img
            src={logoImg}
            alt="Kifa Food Co."
            className="w-9 h-9 rounded-lg object-contain shadow-xs shrink-0"
          />
          <div className="min-w-0 flex flex-col justify-center">
            <span className="font-brand font-bold text-base tracking-wide text-white select-none truncate">
              Kifa Food Co.
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5 leading-none">
              Distribution
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main Links */}
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-900/70 text-white font-semibold shadow-xs border-l-3 border-[#F59E0B]'
                    : 'text-slate-300 hover:bg-blue-900/40 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F59E0B]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* More Section Accordion (ADMIN only) */}
          {isAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setIsMoreExpanded(!isMoreExpanded)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isMoreActive
                    ? 'text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Management / More</span>
                {isMoreExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {(isMoreExpanded || isMoreActive) && (
                <div className="mt-1 pl-2 space-y-0.5 border-l border-blue-900/60 ml-3">
                  {moreNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-900/80 text-white font-semibold text-[#F59E0B]'
                            : 'text-slate-300 hover:bg-blue-900/40 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Settings Link */}
        <div className="p-3 border-t border-blue-900/50 bg-[#0F172A]/50">
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 'settings'
                ? 'bg-blue-900/70 text-white font-semibold border-l-3 border-[#F59E0B]'
                : 'text-slate-300 hover:bg-blue-900/40 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
