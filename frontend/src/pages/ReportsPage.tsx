import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { PaymentMethodBadge } from '../components/ui/Badge';
import { SalesTrendChart, DayData } from '../components/charts/SalesTrendChart';
import { PaymentBreakdownChart } from '../components/charts/PaymentBreakdownChart';
import { TopProductsChart, TopProductItem } from '../components/charts/TopProductsChart';
import {
  BarChart3,
  Download,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Store,
  Truck,
  RotateCcw,
  Phone,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { sales, payments, shops, products, trips, returns } = useBakery();
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');
  const [reportType, setReportType] = useState<
    'sales' | 'collection' | 'outstanding' | 'product' | 'trip'
  >('sales');

  const reportTabs = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'collection', label: 'Collection Report' },
    { id: 'outstanding', label: 'Outstanding Report' },
    { id: 'product', label: 'Product Report' },
    { id: 'trip', label: 'Trip Report' },
  ];

  // Helper date boundaries
  const { todayStr, weekStartStr, monthStartStr } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Current week starting from Monday (or past 7 days)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMon);
    const weekStartStr = monday.toISOString().slice(0, 10);

    // First of current month
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = firstOfMonth.toISOString().slice(0, 10);

    return { todayStr, weekStartStr, monthStartStr };
  }, []);

  // Filtered Sales according to selected time filter
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = s.date;
      if (!saleDate) return false;
      if (timeFilter === 'today') return saleDate === todayStr;
      if (timeFilter === 'week') return saleDate >= weekStartStr && saleDate <= todayStr;
      if (timeFilter === 'month') return saleDate >= monthStartStr && saleDate <= todayStr;
      return true;
    });
  }, [sales, timeFilter, todayStr, weekStartStr, monthStartStr]);

  // Filtered Payments according to selected time filter
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDate = p.date;
      if (!pDate) return false;
      if (timeFilter === 'today') return pDate === todayStr;
      if (timeFilter === 'week') return pDate >= weekStartStr && pDate <= todayStr;
      if (timeFilter === 'month') return pDate >= monthStartStr && pDate <= todayStr;
      return true;
    });
  }, [payments, timeFilter, todayStr, weekStartStr, monthStartStr]);

  // Filtered Trips according to selected time filter
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const tDate = t.date;
      if (!tDate) return false;
      if (timeFilter === 'today') return tDate === todayStr;
      if (timeFilter === 'week') return tDate >= weekStartStr && tDate <= todayStr;
      if (timeFilter === 'month') return tDate >= monthStartStr && tDate <= todayStr;
      return true;
    });
  }, [trips, timeFilter, todayStr, weekStartStr, monthStartStr]);

  // Filtered Returns according to selected time filter
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const rDate = r.date;
      if (!rDate) return false;
      if (timeFilter === 'today') return rDate === todayStr;
      if (timeFilter === 'week') return rDate >= weekStartStr && rDate <= todayStr;
      if (timeFilter === 'month') return rDate >= monthStartStr && rDate <= todayStr;
      return true;
    });
  }, [returns, timeFilter, todayStr, weekStartStr, monthStartStr]);

  // Payment Breakdown calculated from filtered payments
  const filteredPaymentBreakdown = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    let bankTransfer = 0;

    filteredPayments.forEach((p) => {
      if (p.method === 'Cash') cash += p.amount;
      else if (p.method === 'UPI') upi += p.amount;
      else if (p.method === 'Card') card += p.amount;
      else if (p.method === 'Bank Transfer') bankTransfer += p.amount;
    });

    return { cash, upi, card, bankTransfer };
  }, [filteredPayments]);

  // Real 7-day Sales Trend Data calculated from actual sales
  const salesTrendData: DayData[] = useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      const daySalesTotal = sales
        .filter((s) => s.date === dateStr)
        .reduce((sum, s) => sum + s.total, 0);

      days.push({
        day: dayLabel,
        date: displayDate,
        sales: daySalesTotal,
      });
    }

    return days;
  }, [sales]);

  // Real Top Products calculated from filtered sales data
  const realTopProducts: TopProductItem[] = useMemo(() => {
    const productMap = new Map<string, { name: string; unit: string; quantitySold: number; revenue: number }>();

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productMap.get(item.productId) || {
          name: item.productName || 'Bakery Product',
          unit: item.unit || 'packets',
          quantitySold: 0,
          revenue: 0,
        };
        existing.quantitySold += item.quantity;
        existing.revenue += item.total;
        productMap.set(item.productId, existing);
      });
    });

    const list: TopProductItem[] = Array.from(productMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      unit: data.unit,
      quantitySold: data.quantitySold,
      revenue: data.revenue,
    }));

    // Sort by quantitySold descending
    list.sort((a, b) => b.quantitySold - a.quantitySold);
    return list.slice(0, 10);
  }, [filteredSales]);

  // Sales computations
  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const numSales = filteredSales.length;
  const avgSale = numSales > 0 ? Math.round(totalSales / numSales) : 0;

  // Outstanding computations
  const shopsWithOutstanding = shops.filter((s) => s.outstanding > 0);
  const totalDue = shopsWithOutstanding.reduce((sum, s) => sum + s.outstanding, 0);

  // Trips computations
  const totalVisitedShops = filteredTrips.reduce(
    (sum, t) => sum + t.shops.filter((s) => s.status === 'completed').length,
    0
  );
  const totalUnitsDelivered = filteredTrips.reduce(
    (sum, t) => sum + t.loadedItems.reduce((acc, li) => acc + li.soldQty, 0),
    0
  );
  const totalReturnsCount = filteredReturns.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Business performance analytics, route yields and financial audits
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          {(['today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                timeFilter === t
                  ? 'bg-[#172554] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs
        tabs={reportTabs}
        activeTab={reportType}
        onChange={(id) => setReportType(id as any)}
      />

      {/* 1. SALES REPORT */}
      {reportType === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Total Sales Revenue
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                ₹{totalSales.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                ↑ 14% vs previous period
              </span>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Number of Sales Invoices
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">{numSales}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Store deliveries</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Average Sale Value
              </span>
              <div className="text-2xl font-bold text-[#172554] mt-2">
                ₹{avgSale.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Per shop delivery</span>
            </Card>
          </div>

          <Card className="p-5 border-slate-200">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
              <CardTitle>Daily Sales Curve</CardTitle>
            </CardHeader>
            <SalesTrendChart data={salesTrendData} todaySales={totalSales} />
          </Card>
        </div>
      )}

      {/* 2. COLLECTION REPORT */}
      {reportType === 'collection' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 border-slate-200 flex flex-col justify-between">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
                <CardTitle>Payment Instrument Distribution</CardTitle>
              </CardHeader>
              <PaymentBreakdownChart breakdown={filteredPaymentBreakdown} />
            </Card>

            <Card className="p-5 border-slate-200">
              <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-3">
                <CardTitle>Collection Mode Summary</CardTitle>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-lg bg-emerald-50 text-emerald-900 font-semibold">
                  <span>Cash in Hand:</span>
                  <span>₹{filteredPaymentBreakdown.cash.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-blue-50 text-blue-900 font-semibold">
                  <span>UPI / QR Digital:</span>
                  <span>₹{filteredPaymentBreakdown.upi.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-amber-50 text-amber-900 font-semibold">
                  <span>Card POS:</span>
                  <span>₹{filteredPaymentBreakdown.card.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-slate-100 text-slate-800 font-semibold">
                  <span>Bank NEFT / Direct:</span>
                  <span>₹{filteredPaymentBreakdown.bankTransfer.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 3. OUTSTANDING REPORT */}
      {reportType === 'outstanding' && (
        <div className="space-y-6">
          <Card className="p-5 border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <CardTitle>Shop-wise Outstanding Receivables</CardTitle>
                <p className="text-xs text-slate-500">
                  Total Receivables: <strong>₹{totalDue.toLocaleString('en-IN')}</strong> across{' '}
                  {shopsWithOutstanding.length} stores
                </p>
              </div>
            </div>

            {/* MOBILE OUTSTANDING CARDS */}
            <div className="md:hidden space-y-2.5">
              {shopsWithOutstanding.map((shop) => (
                <Card key={shop.id} className="p-3.5 border-slate-200 bg-white shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{shop.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{shop.owner} • {shop.route}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Due</span>
                      <span className="text-base font-black text-rose-600 block">
                        ₹{shop.outstanding.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1 text-slate-600 hover:text-[#172554]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{shop.phone}</span>
                    </a>
                    <span>Limit: ₹{shop.creditLimit.toLocaleString('en-IN')}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* DESKTOP OUTSTANDING TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Shop Name</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3 text-right">Credit Limit</th>
                    <th className="py-2.5 px-4 text-right">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shopsWithOutstanding.map((shop) => (
                    <tr key={shop.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-900">{shop.name}</td>
                      <td className="py-3 px-3 text-slate-700">{shop.owner}</td>
                      <td className="py-3 px-3 text-slate-500">{shop.phone}</td>
                      <td className="py-3 px-3 text-slate-500">{shop.route}</td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        ₹{shop.creditLimit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                        ₹{shop.outstanding.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 4. PRODUCT REPORT */}
      {reportType === 'product' && (
        <div className="space-y-6">
          <Card className="p-5 border-slate-200">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
              <CardTitle>Top Selling Bakery Items by Volume &amp; Revenue</CardTitle>
            </CardHeader>
            <TopProductsChart items={realTopProducts} />
          </Card>
        </div>
      )}

      {/* 5. TRIP REPORT */}
      {reportType === 'trip' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="p-4 border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                Total Trips Dispatched
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">{trips.length}</div>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                Shops Visited
              </span>
              <div className="text-2xl font-bold text-[#172554] mt-2">{totalVisitedShops}</div>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                Products Delivered
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {totalUnitsDelivered} units
              </div>
            </Card>

            <Card className="p-4 border-slate-200">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                Total Returns
              </span>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                {totalReturnsCount} units
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
