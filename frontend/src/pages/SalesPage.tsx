import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { PaymentMethodBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Plus, Receipt, Calendar, Store, Filter, IndianRupee, ChevronRight } from 'lucide-react';
import { Sale } from '../types';

interface SalesPageProps {
  onOpenRecordSale: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({ onOpenRecordSale }) => {
  const { sales, businessSettings } = useBakery();
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.shopName.toLowerCase().includes(search.toLowerCase()) ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchesMethod = filterMethod === 'all' || s.paymentMethod === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const totalSalesAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sales</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Store delivery invoices, line items, and payment status
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onOpenRecordSale}
        >
          + Record Sale
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by shop or invoice #..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Method:
          </span>
          {['all', 'Cash', 'UPI', 'Due', 'Partial'].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
                filterMethod === m
                  ? 'bg-[#172554] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE PRESENTATION: Clean Sales Cards */}
      <div className="md:hidden space-y-3">
        {filteredSales.map((sale) => {
          const paid = sale.paidAmount !== undefined 
            ? sale.paidAmount 
            : (sale.paymentMethod === 'Due' ? 0 : sale.total);
          const due = sale.remainingDue !== undefined 
            ? sale.remainingDue 
            : Math.max(0, sale.total - paid);

          return (
            <Card
              key={sale.id}
              hoverEffect
              onClick={() => setSelectedSale(sale)}
              className="p-4 border-slate-200 bg-white cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 block">
                    {sale.invoiceNumber}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-0.5">{sale.shopName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 block">
                    ₹{sale.total.toLocaleString('en-IN')}
                  </span>
                  <PaymentMethodBadge method={sale.paymentMethod} />
                </div>
              </div>

              {/* Settlement summary */}
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Paid <strong className="text-emerald-600 font-semibold">₹{paid.toLocaleString('en-IN')}</strong> • Due <strong className={due > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500 font-normal'}>₹{due.toLocaleString('en-IN')}</strong>
                </span>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sale.date} • {sale.time}</span>
                </span>
                <span className="text-[#172554] font-semibold flex items-center gap-0.5 text-xs">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          );
        })}

        {filteredSales.length === 0 && (
          <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
            No sales invoices match your filters.
          </Card>
        )}
      </div>

      {/* DESKTOP PRESENTATION: Table */}
      <Card className="hidden md:block overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Shop</th>
                <th className="py-3 px-3">Date &amp; Time</th>
                <th className="py-3 px-3">Items Count</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {sale.invoiceNumber}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{sale.shopName}</span>
                    <span className="text-[11px] text-slate-400">
                      {sale.tripId ? 'Via Van Route' : 'Direct Billing'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <span>{sale.date}</span>
                    <span className="text-slate-400 text-[11px] block">{sale.time}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {sale.items.length} {sale.items.length === 1 ? 'product' : 'products'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                    ₹{sale.total.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <PaymentMethodBadge method={sale.paymentMethod} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="text-[#172554] hover:underline font-semibold text-xs"
                    >
                      View Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No sales invoices match your filters.
          </div>
        )}

        {/* Footer Summary */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Total Sales Displayed: {filteredSales.length} invoices</span>
          <span className="text-sm text-slate-900 font-bold">
            Total: ₹{totalSalesAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Invoice ${selectedSale.invoiceNumber}`}
          description={`Issued to ${selectedSale.shopName} on ${selectedSale.date} at ${selectedSale.time}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
              >
                Print Invoice
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedSale(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Business Header from Settings */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {businessSettings.business_name}
                  </h3>
                  {businessSettings.address && (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      {businessSettings.address}
                    </p>
                  )}
                </div>
                <div className="text-left sm:text-right text-[11px] text-slate-600 shrink-0">
                  {businessSettings.gstin && (
                    <p><span className="font-semibold text-slate-700">GSTIN:</span> {businessSettings.gstin}</p>
                  )}
                  {businessSettings.phone && (
                    <p><span className="font-semibold text-slate-700">Phone:</span> {businessSettings.phone}</p>
                  )}
                </div>
              </div>
              <div className="pt-1 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                <span><strong>Invoice:</strong> {selectedSale.invoiceNumber}</span>
                <span><strong>Date:</strong> {selectedSale.date} {selectedSale.time}</span>
              </div>
            </div>

            {/* Customer & Payment Mode */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Retail Customer</span>
                <span className="font-bold text-slate-900 text-sm">{selectedSale.shopName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Payment Mode</span>
                <PaymentMethodBadge method={selectedSale.paymentMethod} />
              </div>
            </div>

            {/* Line items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.productName}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        ₹{item.unitPrice}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        ₹{item.total.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-right">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{selectedSale.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Special Discount:</span>
                  <span>-₹{selectedSale.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>₹{selectedSale.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Paid Now:</span>
                <span>₹{selectedSale.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              {selectedSale.remainingDue > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span>₹{selectedSale.remainingDue.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Configured Invoice Footer Note from Settings */}
            {businessSettings.invoice_footer_note && (
              <div className="pt-3 border-t border-dashed border-slate-300 text-center text-slate-500 text-[11px] italic leading-relaxed">
                {businessSettings.invoice_footer_note}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
