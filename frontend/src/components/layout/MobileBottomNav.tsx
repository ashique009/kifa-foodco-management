import React from 'react';
import { LayoutDashboard, Truck, ShoppingCart, Store, Plus } from 'lucide-react';
import { NavigationPage } from './Sidebar';

interface MobileBottomNavProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  onQuickAction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onNavigate,
  onQuickAction,
}) => {
  const navItems = [
    { id: 'dashboard' as NavigationPage, label: 'Home', icon: LayoutDashboard },
    { id: 'trips' as NavigationPage, label: 'Trips', icon: Truck },
    { id: 'shops' as NavigationPage, label: 'Shops', icon: Store },
    { id: 'sales' as NavigationPage, label: 'Sales', icon: ShoppingCart },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-lg px-2 py-1.5 lg:hidden flex items-center justify-around">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition-colors ${
              isActive ? 'text-[#172554] font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#172554]' : 'text-slate-400'}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}

      {/* Center Quick Action button (+ New Action) */}
      <button
        onClick={onQuickAction}
        className="w-12 h-12 -mt-5 rounded-full bg-[#172554] text-[#F59E0B] shadow-lg flex items-center justify-center border-2 border-white hover:bg-slate-900 transition-transform active:scale-95"
        aria-label="Quick Action"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition-colors ${
              isActive ? 'text-[#172554] font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#172554]' : 'text-slate-400'}`} />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
