import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { PaymentMethodBadge } from '../components/ui/Badge';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { Modal } from '../components/ui/Modal';
import { Plus, Filter, Calendar, SlidersHorizontal, Check } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const { payments, paymentBreakdown, todayCollectionTotal } = useBakery();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const todayStr = '2026-09-14';

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.shopName.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(search.toLowerCase()));

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = p.date === todayStr;
    } else if (dateFilter === 'week') {
      matchesDate = p.date >= '2026-09-08';
    } else if (dateFilter === 'month') {
      matchesDate = p.date >= '2026-09-01';
    }

    return matchesSearch && matchesMethod && matchesDate;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Prominent Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cash, UPI and bank transfer collections received from retail shops
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsRecordPaymentOpen(true)}
          className="shadow-sm"
        >
          + Receive Payment
        </Button>
      </div>

      {/* Top Simple Summary Card & Compact Breakdown */}
      <Card className="p-4 sm:p-5 border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Today's Collection
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#172554] tracking-tight mt-1">
              ₹{todayCollectionTotal.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Compact payment-method breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-700">Cash</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">
                ₹{paymentBreakdown.cash.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-lg bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-blue-700">UPI</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">
                ₹{paymentBreakdown.upi.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-lg bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-800">Card</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">
                ₹{paymentBreakdown.card.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-lg bg-slate-100/80 border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-600">Bank</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">
                ₹{paymentBreakdown.bankTransfer.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search shops..."
          />
        </div>

        {/* Desktop Filter Bars */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            {(['today', 'week', 'month', 'all'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors capitalize ${
                  dateFilter === d
                    ? 'bg-[#172554] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d === 'today' ? 'Today' : d === 'week' ? 'This Week' : d === 'month' ? 'This Month' : 'All'}
              </button>
            ))}
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            {['all', 'Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  methodFilter === m
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'all' ? 'All' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Filter Trigger Button */}
        <div className="flex items-center gap-2 w-full lg:hidden justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['today', 'week', 'all'].map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg shrink-0 ${
                  dateFilter === d
                    ? 'bg-[#172554] text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {d === 'today' ? 'Today' : d === 'week' ? 'This Week' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 shrink-0 shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters</span>
            {(methodFilter !== 'all' || dateFilter !== 'today') && (
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE PRESENTATION: Clean Payment Cards (No horizontal table scroll!) */}
      <div className="block lg:hidden space-y-3">
        {filteredPayments.map((p) => (
          <Card key={p.id} className="p-4 border-slate-200 bg-white shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{p.shopName}</h3>
                <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                  Receipt #{p.receiptNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-emerald-600 block">
                  ₹{p.amount.toLocaleString('en-IN')}
                </span>
                <PaymentMethodBadge method={p.method} />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{p.date === todayStr ? 'Today' : p.date}</span>
              </span>
              {p.reference ? (
                <span className="font-mono text-[11px] text-slate-400">Ref: {p.reference}</span>
              ) : (
                <span className="text-slate-400 text-[11px]">Received by {p.receivedBy || 'Staff'}</span>
              )}
            </div>
          </Card>
        ))}

        {filteredPayments.length === 0 && (
          <Card className="p-8 text-center border-slate-200 text-slate-500 text-xs">
            No payments have been recorded for this period.
          </Card>
        )}
      </div>

      {/* DESKTOP PRESENTATION: Table */}
      <Card className="hidden lg:block overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Shop</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-3">Received By</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {p.receiptNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{p.shopName}</td>
                  <td className="py-3 px-3 text-slate-600">{p.date}</td>
                  <td className="py-3 px-3">
                    <PaymentMethodBadge method={p.method} />
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {p.reference || '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{p.receivedBy || 'Staff'}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                    +₹{p.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No payments have been recorded for this period.
          </div>
        )}
      </Card>

      {/* Mobile Filter Modal / Bottom Sheet */}
      <Modal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Payments"
        description="Filter collections by date range and payment instrument"
        maxWidth="sm"
        footer={
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => setIsMobileFilterOpen(false)}
          >
            Apply Filters ({filteredPayments.length} results)
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Time Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All History' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateFilter(d.id as any)}
                  className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                    dateFilter === d.id
                      ? 'bg-[#172554] text-white border-[#172554]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Instrument
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['all', 'Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                    methodFilter === m
                      ? 'bg-[#172554] text-white border-[#172554]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m === 'all' ? 'All Modes' : m}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center text-slate-500">
            <button
              type="button"
              onClick={() => {
                setDateFilter('today');
                setMethodFilter('all');
              }}
              className="text-slate-600 hover:underline text-xs"
            >
              Reset Filters
            </button>
            <span>{filteredPayments.length} matching payments</span>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <ReceivePaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
      />
    </div>
  );
};
